# P23.10 Final RC Validation Matrix Execution Plan

## 1. Purpose

This document plans the final v1.0 release-candidate validation matrix execution after the P23.9 blocker burn-down plan.

This phase is planning only. It does not execute the final RC validation matrix, implement automated validation aggregators, implement schema/version runtime enforcement, run SQLite migration apply, run import/export apply, mutate durable memory, run providers, install watchdog/startup tasks, modify Codex/Claude config, push, tag, release, or deploy.

## 2. Current RC Validation State

Current state:

- P22 local HTTP MCP deploy/validation evidence is recorded and closed.
- P23 planning chain exists through P23.9.
- P23.8 final decision remains `READY_FOR_DOCS_ONLY_RC_REVIEW`, not `READY_FOR_V1_0_RC`.
- P23.9 classified remaining blockers and placed this phase first in the burn-down order.
- Public MCP tools remain:
  - `record_memory`
  - `search_memory`
  - `memory_overview`

The final RC validation matrix has not been executed.

## 3. What This Phase Plans

This phase plans:

- validation groups required before a v1.0 RC readiness claim.
- command and evidence sources for each group.
- pass/fail semantics.
- execution order.
- evidence capture requirements.
- blocker mapping.
- A4.8-safe versus A5-gated validation items.
- stop conditions before any side-effectful action.

## 4. What This Phase Explicitly Does Not Do

This phase does not:

- execute the final RC validation matrix.
- implement automated validation aggregator.
- implement schema/version runtime enforcement.
- run SQLite migration apply.
- run import/export apply.
- mutate durable memory.
- run provider.
- install watchdog/startup task.
- modify Codex/Claude config.
- push, tag, release, or deploy.
- alter public MCP tools.
- execute destructive rollback.

## 5. Final RC Validation Matrix Scope

The final RC validation matrix should cover local, auditable, non-provider evidence first. It should separate:

- A4.8-safe local validation.
- A4.8-safe docs/status/board evidence capture.
- A5-gated runtime, config, provider, migration, publication, or destructive validation.

The matrix should produce a single result record with:

- target commit.
- execution date.
- validation groups.
- command/evidence source.
- result per group.
- blockers.
- explicit non-actions.
- final decision.

## 6. Required Validation Groups

Required validation groups:

- docs/status/board validation.
- git diff hygiene.
- P23 docs trailing whitespace check.
- MCP `/health` evidence.
- `initialize/tools/list` evidence.
- public MCP tools exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `observe:http status=ok` evidence.
- MCP/HTTP tests `12/12` evidence.
- schema/versioning review gate.
- validation aggregator readiness gate.
- migration/import-export dry-run gate.
- backup/restore readiness gate.
- rollback readiness gate.
- secret/workspace exposure check.
- Codex/Claude client boundary review.
- production deploy gate.
- startup/watchdog gate.
- provider execution gate.
- push/tag/release gate.

## 7. Command / Evidence Source Inventory

| Group | Command or evidence source | Default execution class | Notes |
|---|---|---|---|
| Docs/status/board validation | `git diff --check`; `scripts/validate-local.ps1 -Area docs`; P2 docs trailing whitespace check | A4.8-safe | Required for docs-only planning and records |
| Git hygiene | `git status -sb`; `git log --oneline --decorate -n 10`; `git diff --stat` | A4.8-safe | Confirms local branch state and changed files |
| MCP `/health` | P22 recorded evidence or future approved local check | A4.8-safe if read-only local service already running; otherwise scoped approval may be required | Do not start services silently |
| `initialize/tools/list` | P22 recorded evidence or future approved MCP/HTTP check | A4.8-safe if read-only local service already running | Must verify exactly three public tools |
| `observe:http` | P22 recorded evidence or future approved `observe:http -- --json` | A4.8-safe if service already running | Must not install watchdog/startup |
| MCP/HTTP tests | Existing MCP/HTTP test result or future targeted test run | A4.8-safe if local tests only | Expected evidence remains `12/12` unless suite changes |
| Schema/versioning review | P23.2 and P25 planning evidence | A4.8-safe planning; runtime enforcement later | No migration apply |
| Validation aggregator readiness | P24 planning or implementation evidence | Planning A4.8-safe; implementation later | No aggregator exists yet |
| Migration/import-export dry-run | Future P26 dry-run gate plan/result | A4.8-safe only if dry-run and fixture/local safe | Apply remains A5 |
| Backup/restore readiness | Future documented backup/restore evidence | Planning A4.8-safe; execution may be A5 | No backup creation in this phase |
| Rollback readiness | rollback plans and non-destructive gates | A4.8-safe for planning/dry-run | Destructive rollback remains A5 |
| Secret/workspace exposure | docs scan and existing safety tests/gates | A4.8-safe if no secrets read | Do not inspect `.env` values |
| Client boundary review | P23.5/P28 docs and future approved evidence | Planning A4.8-safe; config switch A5 | No Codex/Claude config mutation |
| Production deploy gate | future approval packet/result | A5-gated | Not executed by default |
| Startup/watchdog gate | future approval packet/result | A5-gated | Installation validation is A5 |
| Provider execution gate | future approval packet/result | A5-gated | Provider calls are not default |
| Push/tag/release gate | future approval packet/result | A5-gated | Remote publication action |

## 8. Pass / Fail Semantics

Pass requires:

- all A4.8-safe required validation groups pass.
- every skipped A5-gated item is explicitly marked `BLOCKED_PENDING_A5` or `NOT_IN_RC_SCOPE`.
- public MCP tools remain exactly the three-tool baseline.
- no raw secrets, `.env` values, provider keys, authorization headers, cookies, or raw workspace IDs are exposed.
- no unapproved mutation, migration, provider call, config switch, startup/watchdog install, push, tag, release, or deploy occurs.

Fail requires:

- any required A4.8-safe validation command fails.
- changed files exceed approved docs/status/board scope for this planning phase.
- public MCP contract drift is detected.
- secret or raw workspace exposure is detected.
- a hard-stop action is required without explicit approval.
- evidence cannot distinguish local-only validation from production deploy.

## 9. Blocker Mapping

| Blocker | Matrix group | Expected state after execution |
|---|---|---|
| Fresh final RC validation matrix not executed | All groups | Resolved only after actual matrix execution |
| Automated v1.0 validation aggregator not implemented | Validation aggregator readiness | Remains blocker until P24 implementation or explicit non-goal |
| Schema/version runtime enforcement not implemented | Schema/versioning review | Remains blocker until P25 implementation or scoped non-goal |
| Migration/import-export apply unapproved | Migration/import-export dry-run | Apply remains A5; dry-run can reduce blocker scope |
| Production deploy unapproved | Production deploy gate | Remains `BLOCKED_PENDING_A5` |
| Startup/watchdog install unapproved | Startup/watchdog gate | Remains `BLOCKED_PENDING_A5` |
| Codex/Claude config switch unapproved | Client boundary review | Remains `BLOCKED_PENDING_A5` for real switch |
| Provider execution unapproved | Provider execution gate | Remains `BLOCKED_PENDING_A5` unless approved |
| Durable mutation expansion unapproved | Schema/mutation boundary review | Remains out of v1.0 baseline unless approved |
| Destructive rollback unapproved | Rollback readiness | Remains `BLOCKED_PENDING_A5` |
| Push/tag/release/deploy unapproved | Push/tag/release gate | Remains `BLOCKED_PENDING_A5` |

## 10. Execution Order

Recommended final matrix execution order:

1. Confirm repository state and target commit.
2. Run docs/status/board validation.
3. Run git diff hygiene.
4. Run P23 docs trailing whitespace check.
5. Capture or refresh local MCP/HTTP evidence only within approved read-only local boundaries.
6. Verify public MCP tools exactly three.
7. Capture `observe:http` evidence only within approved local boundaries.
8. Record MCP/HTTP test evidence.
9. Run schema/versioning review gate.
10. Run validation aggregator readiness gate.
11. Run migration/import-export dry-run gate.
12. Run backup/restore readiness gate.
13. Run rollback readiness gate.
14. Run secret/workspace exposure check.
15. Run Codex/Claude client boundary review.
16. Record A5-gated production/startup/provider/publication gates as blocked unless separately approved.
17. Produce final evidence record and decision.

## 11. Evidence Capture Requirements

Evidence record should include:

- workspace path.
- branch.
- target commit hash.
- local `origin/main` hash.
- remote `refs/heads/main` hash if a remote check is approved.
- validation command or evidence source.
- pass/fail/blocked/skipped result per group.
- public MCP tool list.
- provider call count.
- mutation flag.
- durable memory touched flag.
- config changed flag.
- migration/import-export apply flag.
- startup/watchdog installation flag.
- push/tag/release/deploy flag.
- known gaps.
- final decision.

## 12. Stop Conditions

Stop if:

- validation needs to start a service but service startup was not explicitly authorized.
- validation needs provider execution.
- validation needs SQLite migration apply or import/export apply.
- validation needs durable memory mutation.
- validation needs Codex/Claude config mutation.
- validation needs startup/watchdog installation.
- validation needs push, tag, release, or deploy.
- public MCP tool drift is detected.
- secrets or raw workspace IDs appear in output.
- a validation failure requires runtime changes outside the current scope.

## 13. A4.8-Safe Validation Items

A4.8-safe validation items:

- docs/status/board validation.
- git diff hygiene.
- P23 docs trailing whitespace check.
- read-only inspection of existing evidence docs.
- planning-level schema/versioning review.
- planning-level validation aggregator readiness review.
- planning-level migration/import-export dry-run gate review.
- planning-level backup/restore readiness review.
- planning-level rollback readiness review.
- planning-level client boundary review.

Local service observation can be A4.8-safe only when it is read-only, already running, and does not install/start service, mutate config, call providers, read real secrets, or write durable memory.

## 14. A5-Gated Validation Items

A5-gated validation/actions include:

- production deploy validation.
- startup/watchdog installation validation.
- Codex config switching validation.
- Claude config switching validation.
- provider execution validation.
- durable memory mutation expansion validation.
- SQLite migration apply validation.
- import/export apply validation.
- destructive rollback execution.
- push/tag/release/deploy.

These require explicit approval packets before execution.

## 15. Known Gaps

Known gaps after this planning phase:

- final RC validation matrix remains planned but not executed.
- automated validation aggregator remains unimplemented.
- schema/version runtime enforcement remains unimplemented.
- migration/import-export apply remains unapproved.
- provider execution remains unapproved.
- startup/watchdog installation remains unapproved.
- Codex/Claude config switching remains unapproved.
- production deploy remains unapproved.
- push/tag/release/deploy remain unapproved.

## 16. Proposed Next Phase

Next recommended phase:

`P23.10-final-rc-validation-matrix-execution-plan-local-commit`

That phase should validate this docs/status/board-only plan, explicitly stage intended files, and create one local-only commit if authorized. It must not execute the final RC validation matrix, implement validators, modify runtime code, run providers, apply migrations/import-export, mutate durable memory, install watchdog/startup tasks, switch Codex/Claude config, push, tag, release, or deploy.

P23.11 final RC validation matrix execution scope review is tracked in [P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md](/A:/codex-memory/docs/P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md).

P23.12 A4-safe validation slice execution is recorded in [P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md](/A:/codex-memory/docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md).
