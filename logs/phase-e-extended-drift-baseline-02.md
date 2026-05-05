# Phase E Extended Drift Baseline 02

时间：2026-05-05 12:49:12 +08:00

## 目的

这份记录用于重新验收 `Phase E / P1-1 扩展字段 drift 收口` 的当前标准 suite 基线。

## 执行命令

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

## compare 结果

- `ok: true`
- `totalCaseCount: 34`
- `comparableCaseCount: 34`
- `matchedCaseCount: 34`
- `mismatchedCaseCount: 0`
- `legacyUnavailableCaseCount: 0`
- `coreMismatchCountTotal: 0`
- `extendedMismatchCountTotal: 0`
- `driftReasonBreakdown: {}`

## rollback 结果

- `ok: true`
- `rollbackReady: true`
- `totalCaseCount: 34`
- `readyCaseCount: 34`
- `notReadyCaseCount: 0`
- `coreMismatchCountTotal: 0`
- `extendedMismatchCountTotal: 0`
- `recommendation: rollback-safe`

## 结论

当前 `P1-1` 没有需要继续收的扩展字段 drift。标准 suite 已从早期 `25` / `30` case 扩到 `34` case，`extendedMismatchCountTotal` 仍保持为 `0`。

本轮没有修改 active-memory 代码；只记录当前实跑基线并同步文档口径。

## 下一步

如果继续精修线，优先从 `P1-2 donor 排序手感继续贴齐` 或 `P1-4 suite 数据集继续扩容` 里选择新的真实差异或高价值样本。
