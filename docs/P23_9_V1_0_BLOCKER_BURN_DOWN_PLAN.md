# P23.9 v1.0 Blocker Burn-Down Plan

## 1. Purpose

This document defines the v1.0 blocker burn-down plan after the P23.8 final RC readiness review.

This is a planning phase only. It does not execute the final RC validation matrix, implement a validation aggregator, implement schema/version runtime enforcement, run SQLite migration apply, run import/export apply, mutate durable memory, run providers, install watchdog/startup tasks, modify Codex/Claude config, push, tag, release, or deploy.

## 2. Current RC State

Current state:

- P22 local HTTP MCP deploy/validation evidence chain is recorded and closed.
- P23 planning chain exists through P23.8.
- P23.8 final RC decision is `READY_FOR_DOCS_ONLY_RC_REVIEW`.
- The project is explicitly not `READY_FOR_V1_0_RC`.
- Public MCP tools remain:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `validate_memory` remains internal-only.
- Production deploy, startup/watchdog install, Codex/Claude config switch, provider execution, migration/import-export apply, durable mutation expansion, destructive rollback, push, tag, release, and deploy remain blocked pending explicit authorization.

## 3. Blocker Inventory

Current blockers:

- fresh final RC validation matrix not executed.
- automated v1.0 validation aggregator not implemented.
- schema/version runtime enforcement not implemented.
- migration/import-export apply remains unapproved.
- production deploy remains unapproved.
- startup/watchdog install remains unapproved.
- Codex/Claude config switch remains unapproved.
- provider execution remains unapproved.
- durable mutation expansion remains unapproved.
- destructive rollback remains unapproved.
- push/tag/release/deploy remain unapproved.

## 4. Blocker Classification

| Blocker name | Current status | Risk level | Required action | A4.8-safe or A5-gated | Requires runtime implementation | Requires validation evidence | Blocks v1.0 RC | Blocks v1.0 release | Suggested phase |
|---|---|---|---|---|---|---|---|---|---|
| Fresh final RC validation matrix not executed | Not run | A2-A4 | Plan and then execute local non-provider matrix | Plan is A4.8-safe; execution may need scoped approval | No | Yes | Yes | Yes | P23.10 |
| Automated v1.0 validation aggregator not implemented | Not implemented | A2-A3 | Plan aggregator, then implement only after scoped phase | Planning A4.8-safe; implementation later | Yes | Yes | Yes | Yes | P24 |
| Schema/version runtime enforcement not implemented | Not implemented | A3-A5 | Plan schema/version enforcement and compatibility tests | Planning A4.8-safe; implementation later; migration apply A5 | Yes | Yes | Yes | Yes | P25 |
| Migration/import-export apply unapproved | Blocked | A5 | Keep dry-run gate first; request A5 only after dry-run evidence | A5-gated for apply | Maybe | Yes | No, if v1.0 RC excludes apply | Yes, if release claims migration readiness | P26 |
| Production deploy unapproved | Blocked | A5 | Prepare deploy authorization packet only after readiness gates | A5-gated | No | Yes | No, if RC is local-only | Yes | P27/P29 |
| Startup/watchdog install unapproved | Blocked | A5 | Prepare local production activation packet | A5-gated | No | Yes | No, if RC is docs/local-only | Yes | P27 |
| Codex/Claude config switch unapproved | Blocked | A5 | Prepare client switch authorization packet | A5-gated | No | Yes | No, if RC is not client-switched | Yes | P28 |
| Provider execution unapproved | Blocked | A5 | Keep provider optional; request only if quality gate requires it | A5-gated | No | Yes if used | No by default | Maybe | P29 or separate provider phase |
| Durable mutation expansion unapproved | Blocked | A5 | Keep public mutation expansion out of v1.0 baseline | A5-gated | Yes | Yes | No if excluded | Yes if claimed | Post-v1.0 or dedicated A5 |
| Destructive rollback unapproved | Blocked | A5 | Keep rollback as plan/dry-run unless authorized | A5-gated | No | Yes | No | Yes for destructive rollback claim | P29 or emergency-only |
| Push/tag/release/deploy unapproved | Blocked | A5 | Prepare publication authorization packet | A5-gated | No | Yes | Yes for published RC | Yes | P29 |

## 5. Burn-Down Strategy

Burn-down strategy:

1. Separate evidence blockers from authorization blockers.
2. Burn down A4.8-safe planning and dry-run blockers first.
3. Do not request A5 until the corresponding plan, rollback story, and validation matrix are specific enough to audit.
4. Preserve the three-tool public MCP contract unless a dedicated A5-approved contract phase changes it.
5. Keep `validate_memory` internal-only.
6. Treat release publication as the last step, not a substitute for readiness evidence.

## 6. Dependency Order

Dependency order:

1. Final RC validation matrix execution planning.
2. Validation aggregator planning and implementation design.
3. Schema/version runtime enforcement planning.
4. Migration/import-export dry-run gate planning.
5. Local production activation authorization package.
6. Codex/Claude client config switch authorization package.
7. v1.0 release authorization package.

Do not execute release publication before validation, schema, migration, local production, and client boundary blockers have been reviewed.

## 7. A4.8-Safe Work Items

A4.8-safe work items:

- P23.10 final RC validation matrix execution plan.
- P24 validation aggregator implementation plan.
- P25 schema/version runtime enforcement plan.
- P26 migration/import-export dry-run gate plan.
- docs/status/board blocker burn-down tracking.
- validation matrix evidence shape docs.
- approval packet drafts with `NOT_APPROVED` default state.
- rollback story drafts.
- known gaps and decision table updates.

These items must not mutate durable memory, run providers, alter config, install startup/watchdog tasks, apply migrations/import-export, or publish releases.

## 8. A5-Gated Work Items

A5-gated work items:

- final RC matrix execution if it starts services, touches real local runtime state, or performs non-doc side effects beyond explicitly approved scope.
- validation aggregator implementation if it changes runtime/test/package surfaces beyond a docs plan.
- schema/version runtime enforcement implementation.
- SQLite migration apply.
- import/export apply.
- durable mutation expansion.
- production deploy.
- startup/watchdog installation.
- Codex/Claude config switching.
- provider execution.
- destructive rollback execution.
- push/tag/release/deploy.

Each A5 item requires an explicit approval packet with scope, allowed files, forbidden files, backup requirement, rollback story, validation commands, and exact approval sentence.

## 9. Runtime Implementation Candidates

Runtime implementation candidates:

- validation aggregator CLI for v1.0 RC gate status.
- schema/version runtime enforcement for durable records and reports.
- schema/version compatibility checks for existing records.
- migration/import-export dry-run gate improvements.
- local production health/readiness verifier.

These are candidates only. This P23.9 phase does not implement them.

## 10. Validation / Evidence Requirements

Required future evidence:

- docs validation for each planning phase.
- final RC validation matrix execution record.
- validator/aggregator targeted tests if implemented.
- schema/version compatibility tests if implemented.
- migration/import-export dry-run evidence before any apply.
- rollback readiness evidence before publication.
- secret/workspace exposure check.
- public MCP tools exactly-three check.
- local HTTP MCP evidence refresh if runtime readiness is claimed.
- explicit no-provider or approved-provider evidence.
- release/tag/deploy approval and result records only if authorized.

## 11. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Publishing before final matrix evidence | False readiness claim | Require P23.10 before any release authorization packet |
| Aggregator changes runtime accidentally | Hidden behavior drift | Plan first, restrict implementation files later, run targeted tests |
| Schema enforcement breaks existing durable records | Recall/write regression | Compatibility review, fixture tests, dry-run scan, rollback story |
| Migration/import-export apply mutates real data | Durable data corruption or leakage | Dry-run first, backup required, A5 approval required |
| Client config switch leaks scope across clients | Privacy boundary regression | Client boundary checklist and explicit config-switch approval |
| Provider execution exposes credentials or incurs cost | Secret/cost risk | No provider by default; A5 approval required |
| Watchdog/startup install changes local machine behavior | Operator control risk | Separate local production activation packet |
| Push/tag/release/deploy publishes incomplete state | Remote side effect | Publication must remain last and A5-gated |

## 12. Recommended Execution Sequence

Recommended sequence:

1. `P23.10-final-rc-validation-matrix-execution-plan`
2. `P24-validation-aggregator-implementation-plan`
3. `P25-schema-version-runtime-enforcement-plan`
4. `P26-migration-import-export-dry-run-gate-plan`
5. `P27-local-production-activation-authorization-package`
6. `P28-client-config-switch-authorization-package`
7. `P29-v1.0-release-authorization-package`

Each phase should close with validation, explicit blockers, and a next-phase recommendation. Implementation phases must be separately authorized and scoped.

## 13. Stop Conditions

Stop if:

- any phase requires push, tag, release, or deploy.
- any phase requires modifying `.env`, secrets, provider keys, or real client config.
- any phase requires SQLite migration apply, import/export apply, durable memory mutation, or destructive rollback.
- any phase would alter public MCP tools or schema without an explicit approval packet.
- validation fails and the fix is not a narrow docs/status/board fix.
- worktree contains unrelated or user-owned changes.
- a proposed implementation phase lacks allowed files, forbidden files, rollback story, or validation commands.

## 14. Proposed Next Phase

Next recommended phase:

`P23.9-v1.0-blocker-burn-down-plan-local-commit`

That phase should validate this docs/status/board-only burn-down plan, explicitly stage only the intended files, and create one local-only commit if authorized. It must not push, tag, release, deploy, modify runtime code, modify tests, modify package files, modify `.env`, modify runtime config, switch Codex/Claude config, implement validator aggregators, implement schema/version runtime enforcement, install watchdog/startup tasks, run providers, run SQLite migration apply, run import/export apply, perform durable memory writes, alter public MCP tools, or execute destructive rollback.
