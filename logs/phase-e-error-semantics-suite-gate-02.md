# Phase E / P1-3 错误语义与诊断输出回归基线（二）

## 复验背景

根据 [PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md#p1-3-错误语义与诊断输出继续贴齐) 的
`P1-3` 计划，在做下一步精修前，先补一条可复用的标准门禁复验记录。  
该轮主要确认现状可作为下一步错误语义收口的基线。

## 复验动作

- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `ok: true`
  - `summary.ok: true`
  - `totalCaseCount: 36`
  - `matchedCaseCount: 36`
  - `mismatchedCaseCount: 0`
  - `coreMismatchCountTotal: 0`
  - `extendedMismatchCountTotal: 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `ok: true`
  - `rollbackReady: true`
  - `readyCaseCount: 36`
  - `notReadyCaseCount: 0`
  - `coreMismatchCountTotal: 0`
  - `extendedMismatchCountTotal: 0`
  - `recommendation: rollback-safe`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-match`
  - `ok: true`
  - `totalCaseCount: 4`
  - `matchedCaseCount: 4`
  - `mismatchedCaseCount: 0`
  - `coreMismatchCountTotal: 0`
  - `extendedMismatchCountTotal: 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-ready`
  - `ok: true`
  - `rollbackReady: true`
  - `readyCaseCount: 4`
  - `notReadyCaseCount: 0`
  - `coreMismatchCountTotal: 0`
  - `extendedMismatchCountTotal: 0`
  - `recommendation: rollback-safe`

## 结果

- P1-3 的错误语义与诊断输出当前仍处于 `36/36 matched` + `36/36 rollback-ready` 的基线。
- `topic-state` 分类路径保持 `4/4` 全绿。
- 这是一条“无代码改动”的复验基线记录，用于接下来错误语义微调前后对照。
