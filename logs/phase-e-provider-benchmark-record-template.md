# Phase E Provider Benchmark Record Template

用途：真实 provider benchmark 或 provider/profile 迁移证据的最小留档模板。

这是一份模板，不代表已经执行真实 provider 调用。使用时复制为新的时间戳记录，并只保留脱敏后的事实。

## Basic Info

| Field | Value |
|---|---|
| Date | YYYY-MM-DD HH:mm +08:00 |
| Area | P3-provider-profile |
| Scope | provider benchmark / provider smoke / profile migration evidence |
| Purpose |  |
| Operator / session |  |
| Approval |  |
| Remote provider touched | yes / no |
| Dataset |  |
| Report file | `benchmarks/reports/provider-benchmark-YYYYMMDD-HHMMSS*.json` |

## Preflight

- `npm run profile-health`: not run / passed / failed
- `npm run profile-gate -- --json --summary-only`: not run / passed / failed
- `npm run gate:mainline`: not run / passed / failed
- Secret handling: API keys stayed in local environment or user profile; no real secret was copied into docs, logs, commits, or command output.

## Command

```powershell
npm run provider-benchmark -- --providers local,bge-m3-local,nvidia --top-k 5 --json
```

如果本次只做 smoke：

```powershell
npm run provider-smoke -- --json
```

## Provider Scope

| Provider | Status | Notes |
|---|---|---|
| local | not run / ok / failed / skipped |  |
| bge-m3-local | not run / ok / failed / skipped |  |
| nvidia | not run / ok / failed / skipped |  |
| cohere | not run / ok / failed / skipped |  |
| voyage | not run / ok / failed / skipped |  |
| jina | not run / ok / failed / skipped |  |

## Result Summary

| Metric | Summary |
|---|---|
| `summary.ok` |  |
| `summary.complete` |  |
| `summary.message` |  |
| `top1` |  |
| `recallAtK` |  |
| `mrr` |  |
| latency |  |
| skipped / incomplete providers |  |

## Interpretation

- Provider-side finding:
- Mainline impact:
- Profile migration impact:
- Recall-chain impact:
- Follow-up:

## Validation

- `git diff --check`: not run / passed / failed
- `npm run gate:mainline`: not run / passed / failed
- Compare suite: not run / passed / failed
- Rollback suite: not run / passed / failed

## Not Validated

- none

## Safety Notes

- No `.env` file was committed.
- No provider secret, authorization header, token, or API key was printed or stored.
- Provider benchmark result is evidence for provider/profile comparison only; it does not replace compare / rollback / mainline gate.
