# CM-1352 Live Client Contract Refresh No-Writes Preflight

Date: 2026-06-01

Status: `PREFLIGHT_ONLY_NOT_APPROVED_NOT_READY`

## Scope

CM-1352 prepares task-book Part 4: live-client contract refresh before any personal dogfood write.

This preflight does not start or ensure HTTP services, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, execute `record_memory`, execute `search_memory`, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Current Local Preflight Baseline

Observed before this docs/status preflight:

```text
branch=main
HEAD=4fc75d68b79d2fe2bee7bcb576360b508cacb5c6
branch_state=main...origin/main [ahead 3]
worktree=dirty with current local source/test/docs/board changes
untracked_left_untouched=CLAUDE.md, docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md
```

This baseline is not live-client evidence. It is only the current local target for future exact approval text.

## Desired Refresh Matrix

The intended live-client contract refresh should prove only client contract shape and auth boundaries, not write or recall reliability:

| Contract surface | Future check | Write risk | Current execution status |
|---|---|---:|---|
| HTTP endpoint health/observe | endpoint-bound health and observe summary | none intended | not executed |
| Authenticated MCP initialize | server identity and protocol handshake | none intended | not executed |
| Authenticated MCP tools/list | public tools exactly `record_memory`, `search_memory`, `memory_overview` | none intended | not executed |
| Authenticated `memory_overview` full contract | full overview shape available only with bearer token | read-only tool call | not executed |
| No-token `memory_overview` selected projection | selected low-disclosure projection only | read-only tool call | not executed |
| No-token `record_memory` | rejected before write | must remain no-write | not executed |
| No-token `search_memory` | rejected before recall pipeline/raw result | read path guarded | not executed |

## Existing Source/Test Evidence To Protect

This preflight relies on source/test records only as input for planning, not as current runtime proof:

- `CM-1255` through `CM-1262`: no-token `memory_overview` selected projection and HTTP/client-visible contract hardening.
- `CM-1263`: historical client acceptance facts were downgraded and must be freshly verified before readiness use.
- `CM-1264` through `CM-1279`: client identity and read/write authority source/test hardening.
- `CM-1349`: current runtime gap delta keeps live-client refresh open.
- `CM-1351`: post-CM1349 A5-GAP-6 aggregation accepted source/test evidence but closed no runtime gaps.

## Approval Boundary Split

Current exact approval checker support is narrower than the desired refresh matrix.

Supported by existing `A5-GAP-4` verifier:

```text
I approve A5-GAP-4 for codex-memory on branch main at commit 4fc75d68b79d2fe2bee7bcb576360b508cacb5c6, endpoint http://127.0.0.1:7605, no config/watchdog/startup change.
```

Supported by existing `A5-GAP-4` verifier:

```text
I approve A5-GAP-4 authenticated MCP initialize/tools-list evidence for codex-memory on branch main at commit 4fc75d68b79d2fe2bee7bcb576360b508cacb5c6, endpoint http://127.0.0.1:7605, using current-session bearer token if already present, without printing or persisting token material, no config/watchdog/startup change, no tools/call.
```

Covered after CM-1353 verifier hardening:

- authenticated `tools/call memory_overview` full-contract proof;
- no-token `tools/call memory_overview` selected-projection proof;
- no-token rejected `tools/call record_memory`;
- no-token rejected `tools/call search_memory`.

These checks are covered only by the exact `A5-GAP-4 live-client no-write contract refresh` approval line added in CM-1353. This preflight still does not treat a broad "no-writes" phrase as authorization for unsupported MCP `tools/call` execution.

## Future No-Writes Evidence Requirements

Any later evidence run must record:

- endpoint, branch, and commit;
- whether a bearer token was already present, without printing token material;
- `initialize` server name and protocol version, sanitized;
- `tools/list` public tool names and count;
- authenticated `memory_overview` full-contract shape summary, sanitized and count-only where possible;
- no-token `memory_overview` selected projection marker and allowlist status;
- no-token `record_memory` rejection before write;
- no-token `search_memory` rejection before raw recall/result body;
- side-effect counters: provider calls `0`, durable memory writes `0`, durable audit writes `0`, config/watchdog/startup changes `0`, public MCP expansion `0`;
- explicit `runtimeReady=false`, `finalRcMatrixReady=false`, `rcReady=false`.

## Explicitly Out Of Scope

- `record_memory` success path;
- authenticated `search_memory`;
- raw memory body output;
- raw audit output;
- broad store/jsonl scan;
- provider/API call;
- service install/startup/watchdog changes;
- config changes or token persistence;
- dependency or lockfile changes;
- public MCP tool/schema expansion;
- push / PR / tag / release / deploy;
- dogfood write;
- RC cutover;
- runtime readiness, write reliability, recall reliability, or `RC_READY` claim.

## Required Fresh Checks Before Any Execution

Before any exact-approved live-client execution, run and inspect:

```powershell
git status --short --branch
git rev-parse HEAD
git log --oneline --decorate -n 10
git diff --stat
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
npm run a5:approval-check -- --expected-unit A5-GAP-4 --expected-branch main --expected-commit <FRESH_HEAD> --approval-line "<EXACT_APPROVAL_LINE>" --json --pretty
```

Stop if:

- `HEAD` differs from the exact approval line;
- the approval line is not accepted by the verifier;
- the endpoint is not exactly approved;
- the action would require printing/persisting token material;
- the action would execute `record_memory`, authenticated `search_memory`, providers, writes, store scans, config/watchdog/startup changes, public MCP expansion, remote action, or readiness claim.

## Current Result

```text
preflightPrepared=true
approvalGranted=false
liveClientRefreshExecuted=false
mcpInitializeExecuted=false
mcpToolsListExecuted=false
memoryOverviewToolCallExecuted=false
recordMemoryExecuted=false
searchMemoryExecuted=false
providerCalls=0
durableMemoryWrites=0
durableAuditWrites=0
configWatchdogStartupChanges=0
publicMcpExpansion=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
decision=NOT_READY_BLOCKED
```
