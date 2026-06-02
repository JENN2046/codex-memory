# RC-8 A5-GAP-6 ValidationAggregator Aggregation Preflight

Phase: `RC-8`

Mode: `A5-GAP-6 preflight packet only`

Risk: `A5-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

Prepare the smallest fresh-head `A5-GAP-6` approval boundary for evidence-only ValidationAggregator aggregation.

This packet does not execute ValidationAggregator, scan files, scan runtime stores, call MCP tools, call providers, mutate durable memory or audit state, change config/watchdog/startup, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = 349d29c299a499da658eede807a6fba0f7bcc4bc
origin/main = fe39bdc chore: align current facts to pushed head
ahead = 11 local commits
worktree = clean
diff = empty
```

Exact branch, commit, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved `A5-GAP-6` execution.

## Selected Evidence Units

The selected unit list is:

```text
A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5
```

Evidence map:

| Unit | Current route evidence | Boundary |
|---|---|---|
| `A5-GAP-1` | `docs/RC5_A5_GAP1_GOVERNANCE_READONLY_PREFLIGHT.md` | read-only governance report, no provider, no mutation, `RC_NOT_READY_BLOCKED` |
| `A5-GAP-2` | `docs/RC6_A5_GAP2_RECALL_ISOLATION_NO_MUTATION_PREFLIGHT.md` | no-mutation recall isolation proof, `projectionLeakageTotal=0`, limitation `NO_CLASSIFIED_REAL_SAMPLE_PRESENT` |
| `A5-GAP-3` | `docs/RC7_A5_GAP3_MIGRATION_DRY_RUN_PREFLIGHT.md` | fixture-only migration readiness dry-run, `status=blocked`, `mutated=false`, `migrationBlocked=true` |
| `A5-GAP-4` | `docs/RC3_A5_GAP4_LIVE_HTTP_NO_WRITE_PREFLIGHT.md` | endpoint-bound live HTTP/MCP no-write evidence |
| `A5-GAP-5` | `docs/RC2_A5_GAP5_STRICT_GATE_PREFLIGHT.md` | target-bound strict gate pass evidence |

## Requested Boundary

Requested unit:

```text
A5-GAP-6
```

Requested action:

```text
evidence-only in-memory aggregation
```

Requested input:

```text
explicit sanitized runtimeEvidenceSummary for approved units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5
```

Only after exact approval, the execution may call:

```text
buildV1RcValidationAggregatorReport({ runtimeEvidenceSummary })
```

Allowed output fields include sanitized aggregation fields such as:

- `runtimeEvidenceSummaryAccepted`
- approved unit list
- remaining gap count
- effective gap source
- command execution flag
- readiness flags
- fail-closed decision

Not allowed:

- file/store scan to discover evidence
- broad real memory scan/export
- raw private content output
- MCP `tools/call`
- provider/model call
- durable memory write
- durable audit write
- migration/import/export/backup/restore
- public MCP expansion
- config/watchdog/startup change
- remote action
- tag/release/deploy/cutover
- readiness or reliability claim

## Exact Approval Line

After this packet is committed, use the fresh post-packet `HEAD` in the approval line:

```text
I approve A5-GAP-6 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, using only evidence from approved A5-GAP units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5.
```

Any broader wording is insufficient. Any reused stale commit is insufficient.

## Stop Conditions

Stop before execution if:

- branch is not `main`
- current `HEAD` does not match the approval line
- worktree is not clean except for intended docs/board preflight edits before commit
- approval line omits any selected unit or includes unsupported/duplicate units
- the execution would need to scan files/stores for evidence rather than consume explicit sanitized input
- the execution would need raw private data output
- the execution would need mutation, durable write, provider call, MCP tool call, broad scan, remote action, or readiness claim not named in the approval line

## Readiness Boundary

Even if the future approved aggregation accepts the sanitized summary, it will not by itself claim:

- production readiness
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- durable writer readiness
- migration/backfill readiness
- `RC_READY`

If remaining gaps are greater than zero, route returns to the corresponding earlier RC gap. If remaining gaps are zero, the next step is RC-9 decision packet preparation, not release or cutover.
