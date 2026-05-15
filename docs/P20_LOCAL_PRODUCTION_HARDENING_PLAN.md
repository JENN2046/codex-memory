# P20 Local Production Hardening Plan

Phase: `P20-local-production-hardening-planning`

Status: planning

## Goal

Plan local production hardening for long-running Codex / Claude use without performing any runtime mutation.

P20 is about making local operation safer, more observable, and easier to recover. This planning phase does not install services, edit startup config, run provider benchmarks, migrate data, apply import/export, or release anything.

## Current Baseline

P20 starts after P19 closed as `ADMIN_REVIEW_SURFACE_FIXTURE_BACKED_AND_OPERATOR_NOTED`.

Current relevant surfaces:

| Surface | Current role |
|---|---|
| `npm run start:http:ensure` | Ensures the local HTTP MCP service is running when explicitly invoked. |
| `npm run observe:http -- --json` | Reports HTTP health, logs, audit summaries, read-policy, governance, and hints. |
| `npm run gate:mainline` | Local health + compare + rollback readiness gate. |
| `npm run gate:mainline:strict` | Adds MCP contract / HTTP tests / `npm test` to the mainline gate. |
| `npm run rollback:mainline:plan -- --json` | Read-only rollback planning surface for Codex MCP mainline config. |
| `npm run profile-health` | Read-only profile/vector/cache health summary. |
| `npm run gate:ci -- --json` | CI-safe fixture-only policy, lifecycle, query-quality, and safety gate. |

## Hardening Questions

P20 should answer:

- Can a local operator tell whether the HTTP MCP service is healthy?
- Can startup and watchdog paths be reviewed without installing or changing them?
- Can local rollback readiness be checked without editing real Codex / Claude config?
- Can backup / restore requirements be documented before any real backup action?
- Can dangerous commands remain explicit and opt-in?
- Can production-readiness evidence be collected without provider calls or real memory mutation?

## Planned Subphases

| Phase | Target | Allowed work | Validation |
|---|---|---|---|
| P20 planning | This plan and status/board handoff | docs/status/board only | `git diff --check`; docs validation |
| P20.1 startup/watchdog inventory | Inventory existing startup and watchdog scripts, risks, and manual approval boundaries | docs/status/board only | `git diff --check`; docs validation |
| P20.2 health/readiness dry-run evidence | Summarize safe read-only health/readiness commands and report shapes | docs/evidence only; optional read-only local gates if explicitly scoped | docs validation; optional `observe:http` / `rollback:mainline:plan` read-only commands |
| P20.2a gate-ci TagMemo semantic drift review | Review the current CI-safe readiness blocker before deeper local production planning | tests/docs review only unless explicitly scoped | targeted TagMemo fixture test; `gate:ci`; docs validation if docs changed |
| P20.2b TagMemo targeted fixture contract repair | Repair or narrow the P16.3 fixture contract so CI-safe readiness is deterministic again | tests/fixtures/docs only | targeted TagMemo fixture test; `gate:ci`; docs validation if docs changed |
| P20.3 rollback/backup operations plan | Define backup/restore/rollback requirements before any real operation | docs only | docs validation |
| P20.4 local production safety checklist | Checklist for operator preflight, warning signals, and stop conditions | docs only | docs validation |
| P20.x closeout | Summarize evidence and P21 readiness | docs/status/board only | docs validation |

## Explicit Non-Goals

P20 planning does not authorize:

- service installation
- watchdog scheduled task installation
- startup entry installation
- real Codex / Claude config mutation
- `.env` or secret edit
- provider smoke or benchmark
- real memory preview
- durable DB or memory mutation
- SQLite migration or `ALTER TABLE`
- import/export apply
- backup creation or restore
- cleanup apply / confirm
- dependency or lockfile change
- MCP schema/tool change
- public MCP expansion
- public `validate_memory`
- release, tag, or deploy

## Approval Boundaries

The following remain A5 or hard-stop actions:

| Action | Requirement |
|---|---|
| Install or update startup/watchdog scheduled task | Explicit approval packet with rollback story. |
| Edit Codex or Claude real config | Explicit approval and exact target config path. |
| Create real backup or restore from backup | Explicit approval, backup path, restore story, and validation commands. |
| Run provider smoke/benchmark | Explicit approval and provider scope. |
| Apply migration/import/export/cleanup | Explicit approval, dry-run evidence, backup, and rollback story. |
| Release candidate, tag, deploy, publish | Explicit approval and release checklist. |

## Planning Deliverables

P20 should produce evidence in this order:

1. Startup/watchdog inventory.
2. Health/readiness dry-run evidence.
3. Rollback/backup operations plan.
4. Local production safety checklist.
5. P20 closeout review.

Runtime implementation, service installation, and release work must remain deferred until these evidence pieces are complete and an explicit phase authorizes them.

## Validation

Docs-only planning validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Next Recommended Phase

P20.1 startup/watchdog inventory is captured in [P20_STARTUP_WATCHDOG_INVENTORY.md](./P20_STARTUP_WATCHDOG_INVENTORY.md).

P20.2 health/readiness dry-run evidence is captured in [P20_HEALTH_READINESS_DRY_RUN_EVIDENCE.md](./P20_HEALTH_READINESS_DRY_RUN_EVIDENCE.md). Current readiness is blocked by an existing P16.3 TagMemo semantic ordering drift inside `gate:ci`.

P20.2a drift review is captured in [P20_GATE_CI_TAGMEMO_SEMANTIC_DRIFT_REVIEW.md](./P20_GATE_CI_TAGMEMO_SEMANTIC_DRIFT_REVIEW.md).

`P20.2b-tagmemo-targeted-fixture-contract-repair`
