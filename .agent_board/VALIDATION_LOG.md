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
| CMV-0009 | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` ; `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-ready` | P1-donor-compatibility | P1-3 baseline follow-up | COMPLETED_VALIDATED | 基线记录：`36/36 matched`, `36/36 rollback-ready`，`topic-state 4/4 matched`，`topic-state rollback-ready 4/4` | none | 2026-05-05 |
| CMV-0010 | `node --test .\tests\compare-vcp-active-memory-cli.test.js` ; `node --test .\tests\rollback-active-memory-cli.test.js` ; `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` ; `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-ready` ; `npm run gate:mainline` ; `git diff --check` ; `npm test` | P1-donor-compatibility | P1-3 error semantics suite expansion | COMPLETED_VALIDATED | 新增 `topicmemo-gettopiccontent-missing-topic-topicid-alias`；compare `37/37 matched`，rollback `37/37 rollback-ready`，`topic-state 5/5`，mainline gate ok，`npm test 123/123` | none | 2026-05-05 |
| CMV-0011 | `git push origin main` ; `git status --short` ; `npm run gate:mainline` | P0-mainline-health | push-after-a39c1ff | COMPLETED_VALIDATED | push `c70b00e..a39c1ff` succeeded；工作区干净；health `200`，compare `37/37 matched`，rollback `37/37 rollback-ready` | checkpoint-17 log prepared | 2026-05-05 20:59:36 +08:00 |
| CMV-0012 | `node --test .\tests\vcp-active-memory-cli.test.js` ; `node --test .\tests\compare-vcp-active-memory-cli.test.js` ; `node --test .\tests\rollback-active-memory-cli.test.js` ; `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category input-validation --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category input-validation --json --require-ready` ; `npm run gate:mainline` ; `npm test` ; `git diff --check` | P1-donor-compatibility | P1-3 DeepMemo keyword alias error meta | COMPLETED_VALIDATED | 新增 `deepmemo-missing-maid-keyword-alias`；input-validation `5/5 matched` and `5/5 rollback-ready`；mainline gate compare `38/38 matched`、rollback `38/38 rollback-ready`；`npm test 123/123` | 等下一批变更再聚合 checkpoint/commit | 2026-05-05 21:13:38 +08:00 |
| CMV-0013 | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category agent-selection --json --require-match` ; `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category agent-selection --json --require-ready` ; `node --test .\tests\vcp-active-memory-cli.test.js` ; `node --test .\tests\compare-vcp-active-memory-cli.test.js` ; `node --test .\tests\rollback-active-memory-cli.test.js` ; `npm run gate:mainline` ; `npm test` ; `git diff --check` | P1-donor-compatibility | P1-3 DeepMemo agent-not-found KeyWord alias error meta | COMPLETED_VALIDATED | 新增 `deepmemo-agent-not-found-keyword-alias`；agent-selection `8/8 matched` and `8/8 rollback-ready`；mainline gate compare `39/39 matched`、rollback `39/39 rollback-ready`；`npm test 123/123` | 两个小 case 已可聚合提交；推送仍需显式授权 | 2026-05-05 21:21:14 +08:00 |
| CMV-0014 | `git push origin main` ; `git status --short` ; `npm run gate:mainline` | P0-mainline-health | push-after-56c647a | COMPLETED_VALIDATED | push `a386bed..56c647a` succeeded；工作区干净；health `200`，compare `39/39 matched`，rollback `39/39 rollback-ready` | checkpoint-18 log prepared | 2026-05-05 21:27:12 +08:00 |

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
