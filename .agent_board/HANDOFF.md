# HANDOFF.md - codex-memory

<!-- CURRENT-FACTS-ACTIVE-START -->

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current task: `CM-1480 controlled mutation same-actor target probing policy review`.
Current validation: `CMV-1586`.
Current handoff: CM-1480 decides same-actor public dry-run should be unified low disclosure; confirmed mutation remains blocked.

<!-- CURRENT-FACTS-ACTIVE-END -->

## Active Handoff

Goal: implement the next local-safe hardening plan through bounded source/test and docs/contract slices.

Current status: `COMPLETED_VALIDATED_POLICY_REVIEW_NO_RUNTIME_CHANGE`.

Workspace: `A:\codex-memory`.

Current entrypoints:

- `CURRENT_STATE.md`
- `.agent_board/CURRENT_FACTS.json`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`
- `CURRENT_STATE.md`

Completed in this slice:

- CM-1480 added `docs/CM1480_CONTROLLED_MUTATION_SAME_ACTOR_TARGET_PROBING_POLICY_REVIEW.md` and decided same-actor public controlled mutation dry-run must not expose `accepted=true`, `decision=dry-run`, `fromStatus`, `toStatus`, `newFromStatus`, or `newToStatus`; future source/test hardening should unify public projection to low disclosure. No runtime/source change occurred in CM-1480.
- CM-1479 updated `src/app.js` and `tests/controlled-mutation-public-registration.test.js` so public controlled mutation dry-run binds actor identity to request context, rejects missing context actor, masks private/cross-client rejects, and tests existing record allowed dry-run plus independent `dry_run=false` / `confirm=true` fail-closed attempts.
- CM-1478 added `docs/CM1478_CONTROLLED_MUTATION_TARGET_DECISION_PACKET.md` with required operator fields, `<OPERATOR_PROVIDED_EXACT_TARGET_ID>` placeholder, mutation type constrained to exactly one of `validate_memory`, `tombstone_memory`, or `supersede_memory`, rollback/evidence checklists, and explicit non-claims. No target id or mutation type is selected.
- CM-1477 added `docs/CM1477_CONFIRMED_MUTATION_TARGET_SELECTION_READINESS_REVIEW.md` with a go/no-go table, rollback readiness checklist, post-apply evidence checklist, and explicit non-claims. Decision is `GO_FOR_NEXT_NO_APPLY_OPERATOR_NAMED_CANDIDATE_OR_DRY_RUN_PROJECTION_PACKET`, `NO_GO_FOR_CONFIRMED_MUTATION`, and `NO_GO_FOR_AGENT_SELECTED_REAL_TARGET_ID`.
- CM-1476 added `docs/CM1476_CONFIRMED_MUTATION_TARGET_SELECTION_PACKET.md` with minimum safe target class, candidate requirements, exact target approval fields, no-apply preflight, rollback checklist, evidence checklist, and explicit non-claims.
- CM-1475 added `docs/CM1475_CONTROLLED_MUTATION_CONFIRMED_APPLY_APPROVAL_PACKET.md` with exact approval schema, rollback plan, post-mutation evidence checklist, validation requirements, and explicit non-claims.
- CM-1474 reconciled status entrypoints so they no longer point at already-completed CM-1472 implementation or a pending CM-1473 local commit.
- CM-1473 executed in-process MCP `initialize`, `tools/list`, and one safe dry-run `tools/call` each for `validate_memory`, `tombstone_memory`, and `supersede_memory`; all controlled mutation calls returned low-disclosure rejected dry-run projections with `mutated=false`.
- CM-1472 registered `validate_memory`, `tombstone_memory`, and `supersede_memory` as public MCP tools under exact approval, with public dry-run bounded projection and confirmed mutation rejection.
- CM-1471 recorded `APPROVE_CONTROLLED_MUTATION_PUBLIC_REGISTRATION` for future CM-1472 guarded implementation.
- CM-1470 reviewed CM-1469 and decided `GO_TO_OPERATOR_EXACT_APPROVAL_DECISION` / `NO_GO_FOR_AUTOMATIC_REGISTRATION`.
- CM-1461 registered readonly bounded `audit_memory` in public MCP `TOOL_DEFINITIONS` and `app.callTool(...)` under exact approval.
- CM-1469 prepared the controlled mutation public registration approval packet without registering public MCP tools.
- CM-1468 added controlled mutation public contract preflight source/test without registration.
- CM-1460 added readonly bounded `AuditMemoryReadonlyService`, service tests, public-contract preflight tests, and approval packet without public registration.
- CM-1459 added guarded lifecycle SQLite migrate CLI, local release gate scripts, and `audit_memory` approval packet reinforcement.
- CM-1450 tightened no-token loopback warning wording without startup mutation.
- CM-1451 added independent health `policyGates` low-disclosure contract coverage.
- CM-1452 bridged the release gate matrix to default-safe runner exclusions without package script changes.
- CM-1453 reinforced readonly `audit_memory` draft validation against mutation-like inputs without public MCP registration.
- CM-1454 selected no further automatic local-safe slice.
- Recorded CM-1450 through CM-1480 and CMV-1560 through CMV-1586 in `.agent_board`.
- The public MCP expansions in this slice are exact-approved readonly bounded `audit_memory` and exact-approved controlled mutation dry-run tools. No confirmed mutation, raw scan, provider/API call, bearer-token material use, durable memory/audit write, config/watchdog/startup mutation, remote action, readiness claim, or `RC_READY` claim occurred.

Validation: latest `CMV-1586`; CM-1480 docs/board policy review validation recorded in `.agent_board/VALIDATION_LOG.md`.

Boundaries:

- Confirmed `validate_memory`, `tombstone_memory`, and `supersede_memory` mutation remains blocked without separate exact approval.
- No raw scan, provider/API call, bearer token, config/watchdog/startup change, release/tag/deploy, remote action, readiness claim, or `RC_READY` claim is authorized.

Next safe action:

Next safe action is guarded local commit with message `docs: review controlled mutation same-actor probing policy` after validation and diff review pass. Push requires separate explicit authorization. Future same-actor public projection hardening should be a separate source/test task; confirmed mutation, real DB apply, raw/memory/provider/bearer/remote/readiness work remains forbidden unless separately and exactly approved.

## Historical Handoff Archive

Long historical handoff text was compressed by `CM-1420`.

Use:

- `docs/archive/CM1420_CONTEXT_SURFACE_COMPRESSION_INDEX.md`
- Git history before the CM-1420 change
- targeted evidence docs named by task id

Do not paste full historical handoff text into default context unless the current decision requires exact wording.
