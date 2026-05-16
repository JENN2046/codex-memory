# P23.11 Final RC Validation Matrix Execution Scope Review

## 1. Purpose

This document scopes execution of the final v1.0 RC validation matrix before any matrix run is attempted.

The goal is to classify every planned validation item by execution boundary:

- A4.8-safe validation.
- A5-gated validation.
- runtime-implementation-required validation.
- blocked validation.

This phase is a scope review only. It does not execute the final RC validation matrix.

## 2. Current State

- Workspace: `A:\codex-memory`
- Branch: `main`
- Local `main` is ahead of `origin/main` by 9 local commits.
- Latest local commit: `56bc568 docs: plan p23 final rc validation matrix execution`
- P22 local HTTP MCP deploy/validation evidence chain has been recorded and closed.
- P23 planning chain exists through P23.10.
- Final RC validation matrix has been planned but not executed.
- Public MCP tools remain frozen as:
  - `record_memory`
  - `search_memory`
  - `memory_overview`

## 3. Why Scope Review Is Required

The P23.10 matrix combines very different validation classes:

- docs/status/board checks that are fully A4.8-safe.
- read-only evidence refreshes that may be A4.8-safe only if they do not start services.
- gates that require runtime implementation before they can produce meaningful pass/fail evidence.
- A5-gated checks that imply provider execution, config switching, startup/watchdog installation, migration apply, destructive rollback, production deploy, push, tag, or release.

Running the whole matrix without this split would blur evidence review, live service validation, implementation work, and release actions.

## 4. Final RC Matrix Execution Boundary

P23.11 preserves these boundaries:

- This phase does not execute the final RC validation matrix.
- This phase does not start services.
- This phase does not run MCP/HTTP live tests unless already part of docs-only evidence review.
- This phase does not implement validation aggregator.
- This phase does not implement schema/version runtime enforcement.
- This phase does not run SQLite migration apply.
- This phase does not run import/export apply.
- This phase does not mutate durable memory.
- This phase does not run provider.
- This phase does not install watchdog/startup task.
- This phase does not modify Codex/Claude config.
- This phase does not push, tag, release, or deploy.

## 5. A4.8-Safe Validation Items

These items can be executed or reviewed under A4.8 if they remain local, reversible, read-only, non-provider, non-mutating, and inside the workspace:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`
- P2/P23 docs trailing whitespace check.
- docs/status/board consistency review.
- schema/versioning review gate as a documentation review.
- validation aggregator readiness gate as a readiness review only.
- migration/import-export dry-run gate only when using fixture/sandbox dry-run and no apply.
- backup/restore readiness gate as planning/review only.
- rollback readiness gate as non-destructive readiness review only.
- secret/workspace exposure check when it scans repository docs/diff and does not read secret values.
- Codex/Claude client boundary review when it does not modify client config.
- public MCP tool list review from already-recorded evidence or from an already-running local service without service startup.

## 6. A5-Gated Validation Items

These items require separate explicit A5 authorization before execution:

- migration/import-export apply gate.
- destructive rollback execution.
- Codex config switch validation.
- Claude config switch validation.
- provider execution validation.
- startup/watchdog validation that installs, starts, changes, or persists startup/watchdog behavior.
- production deploy validation.
- push/tag/release validation.
- durable memory mutation expansion validation.
- SQLite migration apply validation.
- public MCP contract-breaking validation.

## 7. Runtime-Implementation-Required Items

These items cannot produce full v1.0 RC evidence until runtime or tooling exists:

- automated validation aggregator readiness as an executable aggregator gate.
- schema/version runtime enforcement gate.
- full final RC validation matrix execution if the project requires aggregator-produced evidence rather than manual evidence collation.

Planning or documentation review for these items is A4.8-safe. Implementation is a separate phase and may be A4.8 or A5 depending on file scope and behavior.

## 8. Blocked Items

The following remain blocked now:

- full final RC validation matrix execution as a single run.
- any validation that starts services without explicit scope.
- any validation that calls providers.
- any validation that mutates durable memory.
- any SQLite migration apply.
- any import/export apply.
- any destructive rollback execution.
- any Codex/Claude config switch.
- any startup/watchdog installation or persistent startup mutation.
- any production deploy.
- any push/tag/release.

## 9. Evidence Capture Rules

Evidence records must distinguish:

- fresh command output from prior recorded evidence.
- live observation from docs-only review.
- fixture/sandbox dry-run from real data apply.
- read-only checks from mutating checks.
- A4.8-safe evidence from A5-gated evidence.
- manual review from automated gate output.

Evidence must not include raw secrets, provider keys, authorization headers, cookies, raw `.env` values, raw workspace identifiers, or production memory snippets.

## 10. Stop Conditions

Stop before execution if any item requires:

- service startup outside the approved scope.
- provider/model call.
- `.env` or secret read/write.
- Codex/Claude config mutation.
- startup/watchdog install or persistent startup change.
- SQLite migration apply.
- import/export apply.
- durable memory write or durable data rewrite.
- destructive rollback execution.
- public MCP schema/tool expansion.
- dependency or lockfile change.
- production deploy.
- push, tag, or release.

## 11. Risk Classification

| Validation item | Current evidence source | Can run under A4.8 | Requires A5 | Requires runtime implementation first | Requires live service | Mutates durable state | Blocks v1.0 RC | Blocks v1.0 release | Recommended next action |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `git diff --check` | local git diff | yes | no | no | no | no | yes | yes | Run in next validation execution phase. |
| `validate-local.ps1 -Area docs` | local docs validator | yes | no | no | no | no | yes | yes | Run in next validation execution phase. |
| P2/P23 docs trailing whitespace check | local docs scan | yes | no | no | no | no | yes | yes | Run in next validation execution phase. |
| docs/status/board consistency review | STATUS / next plan / backlog / `.agent_board` | yes | no | no | no | no | yes | yes | Run as manual docs review. |
| MCP `/health` evidence refresh | P22 recorded evidence; local HTTP service if already running | conditional | no if already running; yes if startup/deploy is needed | no | yes | no | yes | yes | Treat as A4.8 only if service is already running and no startup/config change occurs. |
| initialize/tools/list evidence refresh | P22 recorded evidence; local HTTP service if already running | conditional | no if already running; yes if startup/deploy is needed | no | yes | no | yes | yes | Refresh only under an explicit read-only live-observation scope. |
| public MCP tools exactly three | P22 evidence and MCP contract docs | yes | no | no | conditional | no | yes | yes | Verify from docs/evidence; live refresh only if already-running service is in scope. |
| `observe:http status=ok` evidence refresh | P22 recorded evidence; observe CLI if service already running | conditional | no if already running; yes if startup/deploy is needed | no | yes | no | yes | yes | Do not start service in this phase; scope separately before refresh. |
| MCP/HTTP tests `12/12` | P22 recorded evidence; test suite if service state permits | conditional | no if no startup/config mutation; yes if deployment/startup is needed | no | conditional | no | yes | yes | Execute only in scoped read-only validation phase. |
| schema/versioning review gate | P23.2 plan | yes | no | no | no | no | yes | yes | Run as docs/schema review first. |
| validation aggregator readiness gate | P23.3/P23.10 plans | yes for review | no for review; maybe yes later depending implementation scope | yes for executable gate | no | no | yes | yes | Next plan should separate review from implementation. |
| schema/version runtime enforcement gate | P23.2/P23.10 plans | no for full gate | maybe, depending implementation/migration scope | yes | no | no unless migration/apply added | yes | yes | Requires implementation plan before executable validation. |
| migration/import-export dry-run gate | P13/P18/P23.6 evidence | conditional | no for fixture/sandbox dry-run; yes for real-data apply | no | no for fixture/sandbox | no | yes | yes | Scope fixture/sandbox dry-run only before any real data operation. |
| migration/import-export apply gate | P23.6 plan | no | yes | no | no | yes | no unless release scope requires apply | yes | Keep blocked pending A5. |
| backup/restore readiness gate | P23.4/P23.6/P23.10 plans | yes for planning review | yes for real backup/restore execution if outside docs scope | no | no for review | no for review | yes | yes | Review readiness first; real backup/restore needs separate scope. |
| rollback readiness gate | P23.7/P23.8/P23.10 plans | yes for non-destructive readiness | yes for destructive rollback execution | no | no for review | no for review | yes | yes | Keep to non-destructive review until authorized. |
| destructive rollback execution | P23.9/P23.10 blockers | no | yes | no | maybe | yes | no unless release drill required | yes | Blocked pending explicit A5. |
| secret/workspace exposure check | docs/diff scan and redaction policy | yes | no if no secret values are read | no | no | no | yes | yes | Run repository diff/docs scan; do not read secret values. |
| Codex/Claude client boundary review | P23.5 plan | yes | no if docs-only | no | no | no | yes | yes | Run docs/client-boundary review only. |
| Codex config switch validation | P23.5 plan | no | yes | no | maybe | no | no | yes | Blocked pending explicit A5. |
| Claude config switch validation | P23.5 plan | no | yes | no | maybe | no | no | yes | Blocked pending explicit A5. |
| provider execution validation | P23.7/P23.9/P23.10 blockers | no | yes | no | yes | no | no unless release scope requires it | yes | Blocked pending explicit A5. |
| startup/watchdog validation | P23.4 plan | no if install/start/change is required | yes | no | yes | no | no unless local production activation is in scope | yes | Blocked pending explicit A5 for install/startup changes. |
| production deploy validation | P23.7/P23.8/P23.10 blockers | no | yes | no | yes | maybe | no for docs-only RC review | yes | Blocked pending explicit A5. |
| push/tag/release validation | P23.7/P23.8/P23.10 blockers | no | yes | no | yes | no | no for docs-only RC review | yes | Blocked pending explicit A5. |

## 12. Authorization Requirements

A5 authorization must name the exact phase, target capability, mutation scope, allowed files, forbidden files, backup requirement, rollback story, validation commands, safe-push behavior, and explicit approval sentence.

Separate authorization is still required for:

- final RC matrix execution that starts services or performs live side effects.
- automated validation aggregator implementation.
- schema/version runtime enforcement implementation if it touches runtime behavior or durable compatibility.
- migration/import-export apply.
- provider execution.
- startup/watchdog installation or validation with persistent effects.
- Codex/Claude config switching.
- production deploy.
- push, tag, release, or publication.

## 13. Recommended Execution Path

1. Commit this scope review locally after docs validation.
2. Run an A4.8-only final RC validation subset:
   - docs/status/board validation.
   - git diff hygiene.
   - docs trailing whitespace scan.
   - docs/status/board consistency review.
   - schema/versioning review.
   - secret/workspace exposure docs/diff scan.
   - Codex/Claude client boundary review.
3. Separately plan validation aggregator implementation.
4. Separately plan schema/version runtime enforcement.
5. Request A5 approval only for live service refresh, provider execution, config switching, startup/watchdog, migration/import-export apply, production deploy, or push/tag/release actions.

## 14. Proposed Next Phase

`P23.11-final-rc-validation-matrix-execution-scope-review-local-commit`

After that, the next safe execution phase should be an A4.8-only validation subset, not the full final RC validation matrix.
