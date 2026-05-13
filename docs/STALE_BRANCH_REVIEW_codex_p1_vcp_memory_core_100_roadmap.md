# Stale Branch Review: codex/p1-vcp-memory-core-100-roadmap

Review date: 2026-05-13

## Branch Summary

- Branch name: `codex/p1-vcp-memory-core-100-roadmap`
- Base branch: `origin/main`
- Base branch HEAD: `180eec4`
- Compare status: diverged
- Ahead `origin/main`: 20 commits
- Behind `origin/main`: 38 commits
- Merge base: `7d634bb`

## Final Decision

`codex/p1-vcp-memory-core-100-roadmap` is a superseded stale reference branch.

- Do not merge it into `origin/main`.
- Do not rebase it onto `origin/main`.
- Do not use it as a development base.
- Use it only as a read-only reference and selective documentation salvage source.

Future development remains based on `origin/main`.

## Why It Must Not Be Merged

The stale branch predates several mainline hardening stages. Whole-branch merge,
rebase, or broad cherry-pick would create regressions in current mainline
contracts.

### ToolArgumentValidator Regression

Current `origin/main` validates MCP `tools/call` arguments before dispatch through
`ToolArgumentValidator`. The stale branch still passes `params.arguments || {}`
directly into tool execution. Merging the stale runtime would weaken `-32602`
validation for unknown fields, enum mismatches, and invalid scope shapes.

### SecretScanner Regression

Current `origin/main` rejects secret-like `title`, `content`, `evidence`, and
`tags` before diary writes. The stale branch mainly relies on the user-supplied
`sensitivity` field and would bypass the current write-path scanner.

### Lifecycle / Read-Policy Roadmap Regression

Current `origin/main` contains the P11 lifecycle plan, lifecycle fixture schema,
lifecycle SQLite dry-run, lifecycle read-policy fixture work, and implementation
planning. The stale branch does not include that state and would remove or
conflict with the current lifecycle/read-policy route.

### gate:ci Regression

Current `origin/main` includes `gate:ci` checks for `queries` and
`policyPreflight`. The stale branch only has the older
`compare/rollback/tests/docs` gate shape.

### Query Suite Regression

Current `origin/main` has `real-query-suite-core`, fixture recall dry-run,
asserted/passed/failed summaries, and `query:quality` reuse of the shared runner.
The stale branch contains an early schema scaffold and would lose the stronger
fixture assertion baseline.

### Scope Backfill `workspace_id` Reporting Regression

Current `origin/main` counts missing `workspace_id` as a backfill review gap and
marks it as manual-review-only. The stale branch does not count records that only
miss `workspace_id` in `wouldUpdate`, which would under-report a known
governance gap.

### Stale Board / Status Files

The stale branch contains old `.agent_board`, `README`, `STATUS`, and navigation
state. Those files no longer describe current `origin/main` and must not be
copied over current board or status files.

### Validation Not Suitable As Mainline Base

The stale branch is not a suitable validation baseline for current mainline work.
It diverged before P10/P11 hardening and cannot prove current lifecycle,
runtime-policy, query-quality, or CI-gate behavior.

## Allowed Documentation Salvage

Only small, reviewed documentation fragments may be salvaged.

### `docs/personal-production-readiness.md`

The stale branch version may only be used as a reference for a new, current
document such as `docs/PERSONAL_PRODUCTION_READINESS.md`.

Before salvage, it must be updated to:

- current `origin/main` status
- current validation commands
- P10 runtime gates:
  - `SecretScanner`
  - `ToolArgumentValidator`
  - HTTP non-loopback token fail-fast
  - soft read policy default-off
- P11 lifecycle dry-run and fixtures:
  - lifecycle fixture schema
  - lifecycle read-policy fixture
  - lifecycle SQLite dry-run
- current personal production boundary:
  - local-only
  - no public exposure
  - no provider smoke by default
  - no real migration without backup and explicit approval

It must not claim an old tag or stale branch as the current baseline.

### `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md`

Do not migrate this file wholesale. It overlaps with the current roadmap source:

- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`

Only definition-level wording may be extracted, especially the distinction that
`100%` means practical parity for the VCP memory core, not the whole VCPToolBox
ecosystem. Any extracted wording must be aligned with
`docs/VCP_MEMORY_PARITY_ROADMAP.md`.

## Forbidden Salvage

Do not extract or cherry-pick the following from the stale branch:

- `src/`
- `tests/`
- `package.json`
- `.agent_board/`
- `gate-ci` implementation
- `real-query-suite` / `query-quality` implementation
- scope runtime implementation
- `MemoryWriteService` implementation
- MCP server implementation
- SQLite shadow implementation

## Operating Rule

For all future work:

1. Start from `origin/main`.
2. Treat stale branches as read-only references.
3. Salvage documentation only when it has been rewritten against current mainline
   facts.
4. Do not merge, rebase, or cherry-pick stale runtime, test, package, or board
   changes.
