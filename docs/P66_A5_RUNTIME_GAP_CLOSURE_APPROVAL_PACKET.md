# P66 A5 Runtime Gap Closure Approval Packet

Phase: `P66-a5-runtime-gap-closure-approval-packet`

Mode: `A5 preflight packet only`

Risk: `A5-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

This packet translates the seven open P66 runtime gaps into explicit human-approval units.

It is not authorization by itself. It does not run runtime proofs, start HTTP MCP, call providers, read or scan real memory stores, apply migration/import/export/backup/restore work, write durable memory or audit state, expand public MCP tools, push, tag, release, deploy, execute RC cutover, or claim `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = ef599ca docs: record supreme commander protocol commit state
origin/main = a9177d5 fix: tighten review patch safety semantics
ahead = 2 local commits
```

Exact branch, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved A5 execution.

## Controlling Evidence

- [docs/P66_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/P66_RUNTIME_GAP_TRUTH_TABLE.md)
- [docs/P66_60_RUNTIME_GAP_CURRENT_STATE_RECONCILIATION.md](/A:/codex-memory/docs/P66_60_RUNTIME_GAP_CURRENT_STATE_RECONCILIATION.md)
- [docs/P62_A5_RUNTIME_AUTHORIZATION_PRECONDITION_MATRIX.md](/A:/codex-memory/docs/P62_A5_RUNTIME_AUTHORIZATION_PRECONDITION_MATRIX.md)
- [docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md](/A:/codex-memory/docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md)

## Authorization Rule

Each gap below requires a separate explicit approval line. Approval for one gap does not approve any other gap.

Approval to run a gate is not approval to push, tag, release, deploy, switch config, install watchdog/startup entries, call providers, scan broad real memory, apply migrations, run backup/restore apply, expand public MCP, write durable memory, write durable audit, or declare `RC_READY`.

## Requested Approval Units

| Unit | Gap | Requested A5 action | Must not do | Required evidence after execution |
|---|---|---|---|---|
| `A5-GAP-1` | `governance_review_approval_audit_runtime_loop_not_executed` | Execute the smallest governed approval/audit runtime loop against an explicitly named, sanitized test subject and produce machine-readable governance loop evidence. | Do not write durable memory/audit unless the approval line explicitly includes durable write. Do not scan real memory stores, call providers, expand public MCP, or claim readiness. | approval packet id, approved subject, stages executed, audit destination, durable-write flag, sanitized result, fail-closed status. |
| `A5-GAP-2` | `recall_isolation_runtime_proof_not_executed` | Run an authorized recall-isolation runtime proof against explicitly named stores or fixtures and produce a sanitized contamination/evidence report. | Do not perform broad memory export, preview unrelated private content, call providers, mutate stores, or write durable state. | scoped store list, query set, isolated record families, contamination result, redaction summary, no-mutation proof. |
| `A5-GAP-3` | `migration_import_export_backup_restore_approval_execution_blocked` | Execute an approved migration/import/export/backup/restore approval flow only for the exact named dry-run/apply/restore target in the approval line. | Do not apply real migration, import, export, backup, or restore unless that exact action is named. Do not bundle backup with restore or migration by implication. | backup/restore plan id, action type, target, before/after hash or manifest, rollback evidence, result. |
| `A5-GAP-4` | `live_http_operation_readiness_not_claimed` | Run live HTTP MCP readiness checks on the approved local endpoint and capture health/MCP evidence. | Do not install watchdog/startup entries, change config, switch ports, call providers, mutate runtime data, or claim production readiness. | endpoint, health result, public tool list, observe output summary, no-config-change proof, no-public-MCP-expansion proof. |
| `A5-GAP-5` | `mainline_strict_gate_not_executed_for_cutover` | Run a fresh cutover-context strict gate against the exact approved local commit. | Do not push, tag, release, deploy, switch config, run RC cutover, or infer readiness from a passing gate alone. | target commit, branch freshness, command list, gate results, critical gate count, fail-closed summary. |
| `A5-GAP-6` | `validation_aggregator_full_implementation_incomplete` | Feed only explicitly produced, sanitized runtime evidence from the approved gap closures into ValidationAggregator and evaluate full-implementation status. | Do not collect evidence by scanning files or stores unless separately approved. Do not accept stale, partial, warning-only, or local-only evidence as complete. | evidence source map, freshness/baseline binding, missing evidence list, aggregator decision, remaining gaps. |
| `A5-GAP-7` | `rc_cutover_not_executed` | Execute RC cutover only if all previous gaps are closed, fresh gates pass, zero A5 hard stops remain, and a separate release/cutover approval names the exact remote/release actions. | Do not push, tag, release, deploy, publish, switch config, install startup/watchdog, or claim `RC_READY` from this packet alone. | zero-gap report, zero-hard-stop report, release boundary checklist, remote action log, rollback plan. |

## Recommended Execution Order

```text
1. A5-GAP-4 live HTTP operation readiness
2. A5-GAP-5 cutover-context strict gate
3. A5-GAP-1 governance runtime loop
4. A5-GAP-2 recall isolation runtime proof
5. A5-GAP-3 migration/import/export/backup/restore approval execution
6. A5-GAP-6 ValidationAggregator full implementation evaluation
7. A5-GAP-7 RC cutover
```

Rationale: collect operational and gate evidence before aggregator completion evaluation, and keep RC cutover last.

## A5 Hard Stops Preserved

This packet preserves the complete A5 hard-stop set:

```text
push
tag_create
release_create
deploy
config_switch
watchdog_install
startup_install
provider_call
real_memory_scan
sqlite_migration_apply
import_export_apply
backup_restore_apply
durable_memory_write
durable_audit_write
public_mcp_expansion
rc_ready_claim
```

An approval line must name any one of these actions before that action can occur. Unnamed hard stops remain blocked.

## Approval Lines

To authorize a unit, use one exact line and fill the placeholders:

```text
I approve A5-GAP-1 for codex-memory on branch main at commit <COMMIT>, limited to <SUBJECT>, with durable write <yes/no>.
I approve A5-GAP-2 for codex-memory on branch main at commit <COMMIT>, limited to stores <STORE_LIST>, no mutation.
I approve A5-GAP-3 for codex-memory on branch main at commit <COMMIT>, action <dry-run/apply/backup/restore/import/export>, target <TARGET>.
I approve A5-GAP-4 for codex-memory on branch main at commit <COMMIT>, endpoint <ENDPOINT>, no config/watchdog/startup change.
I approve A5-GAP-5 for codex-memory on branch main at commit <COMMIT>, running cutover-context strict gate only, no remote write.
I approve A5-GAP-6 for codex-memory on branch main at commit <COMMIT>, using only evidence from approved A5-GAP units <UNIT_LIST>.
I approve A5-GAP-7 for codex-memory on branch main at commit <COMMIT>, exact remote/release actions <ACTION_LIST>.
```

Any broader wording is treated as insufficient. Any missing placeholder is treated as not approved.

## Preflight Required Before Any Approved Unit

Run and inspect:

```powershell
git status -sb
git log --oneline --decorate -n 10
git diff --stat
git diff --check
```

Then verify:

- worktree contains no unrelated user-owned changes
- branch and commit match the approval line
- no `.env`, secrets, dependency manifests, or lockfiles changed
- public MCP tools remain `record_memory`, `search_memory`, `memory_overview`
- `validate_memory` remains internal-only
- no previous approval line is being reused for a different unit

## Stop Conditions

Stop immediately if:

- branch, commit, endpoint, store, target, action, or unit differs from the approval line
- command output exposes secrets or private memory content beyond the approved scope
- validation fails and the fix is not obvious and local
- execution would require provider calls not named in the approval line
- execution would mutate durable state not named in the approval line
- execution would push, tag, release, deploy, switch config, install watchdog/startup, or expand public MCP without exact approval
- any evidence is stale, partial, warning-only, or not machine-readable

## Current Result

```text
approvalPacketCreated=true
approvalGranted=false
runtimeGapsClosed=false
a5HardStopsCleared=false
validationAggregatorFullImplementation=false
runtimeReady=false
finalRcMatrixReady=false
v1RcReady=false
rcReady=false
cutoverReady=false
decision=NOT_READY_BLOCKED
```
