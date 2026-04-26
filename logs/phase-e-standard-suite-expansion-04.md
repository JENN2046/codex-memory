# Phase E standard suite expansion 04

## 背景

`DeepMemo` 的 blocked-keyword 边界此前已经有：

- 单关键词被过滤后仍成功
- 单一组合整体被屏蔽后的 `all-keywords-blocked`

但还缺一条更像 donor 实战输入的组合样本：

- 多个独立关键词同时被屏蔽
- `blockedKeywords` 和 `blockedKeywordCount` 需要反映完整组合
- `effectiveKeywords` 需要稳定归零

## 这次扩容

- 新增标准 case：
  - `deepmemo-all-keywords-blocked-multi`
- 新增输入文件：
  - `benchmarks/active-memory-suite/inputs/deepmemo-all-keywords-blocked-multi.json`
- 新增专用 legacy script：
  - `benchmarks/active-memory-suite/legacy/deepmemo-all-keywords-blocked-multi-legacy.js`
- 新增 CLI 回归：
  - `DeepMemo CLI should surface multi blocked-keyword diagnostics in error meta`

这条 case 重点覆盖：

- `code=all-keywords-blocked`
- `blockedKeywords=["deepmemo","topicmemo","recall","audit"]`
- `blockedKeywordCount=4`
- `effectiveKeywords=[]`
- `effectiveKeywordText=""`

## 验证

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `13/13`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=30`
  - `extendedMismatchCountTotal=0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=30`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `102/102`

## 结果

- 标准 suite 已从 `29` 个 case 扩到 `30` 个 case
- `DeepMemo` 的 blocked-keyword 组合边界现在也已经进入 compare / rollback 门禁
- donor 风格的 blocked/effective 诊断现在不只覆盖单关键词，还覆盖多关键词组合场景
