# Phase E Standard Suite Expansion 05

更新时间：2026-04-23

## 本轮新增

- 标准 active-memory suite 新增 `DeepMemo` 多关键词组合“部分屏蔽但仍成功”样本：
  - case：`deepmemo-blocked-filtered-success-multi`
  - input：`benchmarks/active-memory-suite/inputs/deepmemo-blocked-filtered-success-multi.json`
  - legacy：`benchmarks/active-memory-suite/legacy/deepmemo-blocked-filtered-success-multi-legacy.js`
- `DeepMemo` CLI 新增 success-path blocked/effective 诊断回归：
  - `DeepMemo CLI should surface partial multi blocked-keyword diagnostics in success meta`
- compare harness 现在会在“新旧两侧 success payload 都显式暴露 `meta`”时，额外比对这批 success-meta 字段：
  - `blockedKeywords`
  - `blockedKeywordCount / blocked_keyword_count`
  - `effectiveKeywords`
  - `effectiveKeywordCount / effective_keyword_count`
  - `effectiveKeywordText / effective_keyword_text`

## 这轮为什么值得补

之前 blocked-keyword 这条线已经覆盖了：

- 单关键词被过滤后仍成功
- 多关键词组合后全部被屏蔽

但还缺最像真实输入的一段中间态：

- 多关键词组合里，部分词被屏蔽
- 剩余词仍然有效
- 最终仍成功召回

这次把这条中间态收进标准 suite 后，blocked/effective donor 诊断就形成了更完整的一对：

- 全屏蔽错误
- 部分屏蔽成功

## 当前基线

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 31`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 31`
  - `extendedMismatchCountTotal = 0`
- `npm test`
  - `103/103`

## 结果

标准 suite 当前已扩到 `31` 个 case。

`DeepMemo` 的 blocked-keyword donor 诊断现在不只在 error-path 有门禁，success-path 的“部分屏蔽但仍成功”也已经进入 compare / rollback 持续守门。
