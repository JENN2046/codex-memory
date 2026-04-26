# Phase E standard suite expansion 03

## 背景

在 `DeepMemo invalid-json` 和 `TopicMemo invalid-json` 已进入标准 suite 后，主动记忆 CLI 的输入错误门禁还差一条高价值 donor 边界：

- `TopicMemo unknown-command`

这条边界不属于 JSON 解析失败，而是“输入能解析，但显式指令不被支持”。把它推进进标准 suite 后，`TopicMemo` 的输入错误门禁会更完整。

## 这次扩容

- 新增标准 case：
  - `topicmemo-unknown-command`
- 新增输入文件：
  - `benchmarks/active-memory-suite/inputs/topicmemo-unknown-command.json`
- 新增专用 legacy script：
  - `benchmarks/active-memory-suite/legacy/topicmemo-unknown-command-legacy.js`

这条 case 重点覆盖：

- `code=unknown-command`
- `command=Search`
- `maid=Keke`
- donor 风格错误文案里的支持指令列表

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `12/12`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=29`
  - `extendedMismatchCountTotal=0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=29`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `101/101`

## 结果

- 标准 suite 已从 `28` 个 case 扩到 `29` 个 case
- `TopicMemo unknown-command` 现在也已经进入 compare / rollback 门禁
- `TopicMemo` 的 donor 风格输入错误门禁现在同时覆盖：
  - `invalid-json`
  - `unknown-command`
  - `history-read-error`
