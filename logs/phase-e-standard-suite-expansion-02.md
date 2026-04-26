# Phase E standard suite expansion 02

## 背景

上一刀已经把 `DeepMemo invalid-json` 推进进标准 active-memory suite，但两条主动记忆 CLI 的输入错误门禁还不够对称：

- `DeepMemo invalid-json`
- `TopicMemo invalid-json`

为了让 compare / rollback 对主动记忆输入错误的 donor 风格诊断形成成对守门，这一刀继续把 `TopicMemo invalid-json` 收进标准集。

## 这次扩容

- 新增标准 case：
  - `topicmemo-invalid-json`
- 新增输入文件：
  - `benchmarks/active-memory-suite/inputs/topicmemo-invalid-json.txt`
- 新增专用 legacy script：
  - `benchmarks/active-memory-suite/legacy/topicmemo-invalid-json-legacy.js`

这条 case 重点覆盖：

- `code=invalid-json`
- `inputSource`
- `rawInputPreview`
- `toolName=TopicMemo`

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `11/11`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=28`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `100/100`

## 结果

- 标准 suite 已从 `27` 个 case 扩到 `28` 个 case
- `TopicMemo invalid-json` 现在也已经进入 compare / rollback 门禁
- 两条主动记忆 CLI 的输入错误 donor 诊断现在都具备仓库级持续守门能力
