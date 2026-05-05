# VALIDATION_LOG.md — codex-memory

| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |
|---|---|---|---|---|---|---|---|
| CMV-0001 | `npm run gate:mainline` | P0-mainline-health | push-after-1159873 | COMPLETED_VALIDATED | health `200`, compare `36/36 matched`, rollback `36/36 rollback-ready` | none | 2026-05-05 |
| CMV-0002 | `git diff --check -- AGENTS.md README_CODEX_MEMORY_AUTOPILOT.md scripts/validate-local.ps1 scripts/validate-local.sh .agent_board/*.md` | P6-docs-drift | autopilot rail | COMPLETED_VALIDATED | whitespace/diff check passed | run local docs validator | 2026-05-05 |
| CMV-0003 | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | P6-docs-drift | autopilot rail | FAILED | initial run exposed `Run-Step` argument forwarding bug in `scripts/validate-local.ps1` | fixed script and reran | 2026-05-05 |
| CMV-0004 | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | P6-docs-drift | autopilot rail | COMPLETED_VALIDATED | docs path validation passed after fixing PowerShell argument forwarding | none | 2026-05-05 |
| CMV-0005 | `bash -n ./scripts/validate-local.sh` | P6-docs-drift | autopilot rail | COMPLETED_VALIDATED | shell script syntax check passed | none | 2026-05-05 |
| CMV-0006 | `npm run observe:http -- --json` | P0-mainline-health | HTTP runtime observability | COMPLETED_VALIDATED | `summary.status` is `warn`, `httpStatus=200`, `watchdogRecoveryCount=12`, no HTTP errors; health and recoverability considered runnable | monitor recovery trend in long-run | 2026-05-05 20:13:29 +08:00 |
| CMV-0007 | `npm run gate:mainline` | P0-mainline-health | mainline gate | COMPLETED_VALIDATED | health ok（200）, compare `36/36 matched`, rollback `36/36 rollback-ready` | none | 2026-05-05 |
| CMV-0008 | `git status --short` + `npm run gate:mainline` | P0-mainline-health | docs sync / checkpoint update | COMPLETED_VALIDATED | 工作区干净；health/compare/rollback 全绿 | update phase-e checkpoint index + daily/checkpoint docs | 2026-05-05 20:30:41 +08:00 |

## Result Labels

```text
COMPLETED_VALIDATED
COMPLETED_UNVALIDATED
PARTIAL
BLOCKED
FAILED
```

## Common Validation Commands

```powershell
npm test
npm run gate:mainline
npm run gate:mainline:strict
npm run observe:http -- --json
npm run rollback:mainline:plan -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
npm run rebuild-profile -- --dry-run --json
npm run profile-health
npm run shadow-compare -- --query "embedding profile migration"
npm run profile-gate -- --json --summary-only
```
