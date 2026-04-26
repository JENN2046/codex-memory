# Phase E Standard Suite Expansion 06

更新时间：2026-04-23

## 本轮新增

- 标准 active-memory suite 新增 `DeepMemo` 重复关键词去重 success 样本：
  - case：`deepmemo-blocked-filtered-success-duplicate`
  - input：`benchmarks/active-memory-suite/inputs/deepmemo-blocked-filtered-success-duplicate.json`
  - legacy：`benchmarks/active-memory-suite/legacy/deepmemo-blocked-filtered-success-duplicate-legacy.js`
- `DeepMemo` CLI 新增 success-path 去重回归：
  - `DeepMemo CLI should dedupe repeated keywords in success blocked/effective meta`

## 这轮补的 donor 边界

这条样本收的是：

- 查询里同时存在重复 blocked 词和重复 allowed 词
- `blockedKeywords` 需要去重并保持首次出现顺序
- `effectiveKeywords` 需要去重并保持首次出现顺序
- `effectiveKeywordText` 需要和 `effectiveKeywords` 顺序一致

这让 blocked/effective 这条 donor 诊断链现在更完整：

- 全屏蔽错误
- 部分屏蔽成功
- 重复关键词去重成功

## 当前基线

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `15/15`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 32`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 32`
  - `extendedMismatchCountTotal = 0`
- `npm test`
  - `104/104`

## 结果

标准 suite 当前已扩到 `32` 个 case。

`DeepMemo` 的 blocked/effective donor 诊断现在不只覆盖“是否被屏蔽”，也开始稳定守住“重复词怎么归一化、怎么保持顺序”这层手感。
