# Phase E Standard Suite Expansion 07

更新时间：2026-04-23

## 本轮新增

- 标准 active-memory suite 新增 `DeepMemo` 高级查询语法混用 success 样本：
  - case：`deepmemo-blocked-filtered-success-advanced`
  - input：`benchmarks/active-memory-suite/inputs/deepmemo-blocked-filtered-success-advanced.json`
  - legacy：`benchmarks/active-memory-suite/legacy/deepmemo-blocked-filtered-success-advanced-legacy.js`
- `DeepMemo` CLI 新增回归：
  - `DeepMemo CLI should preserve blocked/effective diagnostics with advanced syntax success queries`

## 这轮补的 donor 边界

这条样本收的是：

- 引号短语
- 可选组 `{a|b}`
- 权重项 `(term:weight)`
- 和 blocked 词混用后的 success-path 诊断

目标是确认在 donor 风格高级查询里，`blockedKeywords / effectiveKeywords / effectiveKeywordText` 仍然稳定。

## 当前基线

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `16/16`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
  - `25/25`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 33`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 33`
  - `extendedMismatchCountTotal = 0`
- `npm test`
  - `105/105`

## 结果

标准 suite 当前已扩到 `33` 个 case。

`DeepMemo blocked/effective` 这条 donor 线现在已经覆盖：

- 全屏蔽错误
- 部分屏蔽成功
- 重复关键词去重成功
- 高级查询语法混用成功
