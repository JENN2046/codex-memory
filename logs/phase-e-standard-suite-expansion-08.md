# Phase E Standard Suite Expansion 08

## Summary

- 标准 active-memory suite 从 `33` 扩到 `34` 个 case。
- 新增 `DeepMemo` blocked 配置重复值和大小写混用 success case：
  - `deepmemo-blocked-filtered-success-blocked-config-duplicate`
- 这条 case 用来锁住 `CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS` 自身存在重复值与大小写混用时，`blocked/effective` success meta 仍保持 donor 风格归一化输出。

## Added Assets

- 输入：
  - `benchmarks/active-memory-suite/inputs/deepmemo-blocked-filtered-success-blocked-config-duplicate.json`
- legacy 对照：
  - `benchmarks/active-memory-suite/legacy/deepmemo-blocked-filtered-success-blocked-config-duplicate-legacy.js`
- 标准集：
  - `benchmarks/active-memory-suite/standard-suite.json`
- CLI 回归：
  - `tests/vcp-active-memory-cli.test.js`

## Locked Semantics

- `CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS=DeepMemo,deepmemo,AUDIT,audit`
- success meta 归一化后稳定为：
  - `blockedKeywords = ['deepmemo', 'audit']`
  - `blocked_keyword_count = 2`
  - `effectiveKeywords = ['topicmemo', 'recall']`
  - `effective_keyword_count = 2`
  - `effectiveKeywordText = 'topicmemo, recall'`
  - `effective_keyword_text = 'topicmemo, recall'`

## Validation

- `node --test .\tests\vcp-active-memory-cli.test.js` -> `17/17`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js` -> `25/25`
- `node .\src\cli\compare-vcp-active-memory.js --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 34`
  - `extendedMismatchCountTotal = 0`
- `node .\src\cli\rollback-active-memory.js --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 34`
  - `extendedMismatchCountTotal = 0`
- `npm test` -> `106/106`

## Result

- `DeepMemo blocked/effective` 这条 donor 精修线当前已覆盖：
  - 全屏蔽错误
  - 部分屏蔽成功
  - 重复关键词去重成功
  - 高级查询语法混用成功
  - blocked 配置重复值和大小写混用成功
- 到这里为止，这条线可以标记为“封板”：
  - 不再主动扩样本
  - 仅在真实 bug 出现时按需补 case
