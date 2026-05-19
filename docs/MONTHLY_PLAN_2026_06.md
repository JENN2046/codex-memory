# MONTHLY_PLAN_2026_06

Status: `NOT_READY_BLOCKED`

Result boundary: monthly planning and local-safe preparation only; not RC readiness.

Workspace: `A:\codex-memory`

Branch: `main`

Month-start local anchor: `8d3f07b`

Remote baseline: `origin/main = 103c3ac`

Git position at plan creation: `main...origin/main [ahead 8]`

Open blocker: `CMB-0006 - RC_PRECHECK_001 exact A5 approval required`

## Purpose

Prepare the next month of local-safe work for `codex-memory` while preserving the `RC_PRECHECK_001` approval boundary. This document is a local plan record, not approval for A5 execution, push, release, deployment, or cutover.

## Month Objective

Move from `RC_PRECHECK_001` prepared state to an auditable, replayable precheck evidence chain when and only when exact approval is provided. If approval is not provided, continue non-A5 docs/fixtures/test-only hardening and keep `NOT_READY_BLOCKED`.

## Week 1 - Monthly Baseline Freeze

- Freeze month-start state at `8d3f07b` / `main...origin/main [ahead 8]`.
- Keep `CMB-0006` as the controlling blocker for `CM-0512` and `CM-0513`.
- Refresh docs/board references that could imply an obsolete current target.
- Do not run A5 commands.
- Do not push.

## Week 2 - RC_PRECHECK_001 Approval Boundary Maintenance

- Keep `A5-RC-PRECHECK-READONLY` and `A5-RC-PRECHECK-RECALL` separate.
- Recommend readonly precheck first if the user later gives exact approval.
- Treat recall observation as a separate approval with named subject/query/audit boundary.
- Without exact approval, record blocker state only.

## Week 3 - Precheck Result Handling

- If readonly precheck is approved and passes, prepare an `A5-GAP-6 evidence-only aggregation packet` only.
- If precheck warns or fails, classify blocker by gate, HTTP observe, compare, rollback, public MCP freeze, or remaining runtime gap.
- If approval is absent, continue local-safe non-A5 work and do not fabricate evidence.

## Week 4 - Next Local-Safe Phase

Default candidate: `Phase F - VCP full-memory parity hardening` non-A5 slice.

Allowed work:

- docs/fixtures/test-only hardening
- readonly gap inventory
- validation matrix refinement
- observability/admin review surface design draft
- memory governance proposal draft

Blocked work without exact approval:

- public MCP expansion
- provider calls
- real memory broad scan
- migration/import/export/backup/restore apply
- config/watchdog/startup install
- push/tag/release/deploy/cutover
- A5-GAP-7

## Approval Boundary

Current approval state: `DRAFT_NOT_APPROVED` / `BLOCKED`.

`CM-0512` may run only after exact approval for either `A5-RC-PRECHECK-READONLY` or `A5-RC-PRECHECK-RECALL`.

`CM-0513` may advance only after real approved precheck evidence exists.

## Required Result Wording

Maximum positive precheck result:

```text
PRECHECK_PASSED_NOT_RC_READY
```

Default and blocked result:

```text
NOT_READY_BLOCKED
```

Do not claim `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, cutover readiness, migration readiness, or production readiness.

## Validation Plan

Docs/board stages must pass:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

State scans must reject current-state overclaims for readiness, approval, stale target, stale ahead/behind, and unsafe push language.

## Week 2 Result - 2026-05-19

`A5-RC-PRECHECK-READONLY` was exactly approved and executed for target `a6030f36b3026d360c6aa99f97a2d1af44365433`.

Evidence: [docs/RC_PRECHECK_001_READONLY_EVIDENCE.md](/A:/codex-memory/docs/RC_PRECHECK_001_READONLY_EVIDENCE.md).

Result: `PRECHECK_PASSED_NOT_RC_READY`.

Project status remains `NOT_READY_BLOCKED`. Recall observation, A5-GAP-6 aggregation execution, push, cutover, A5-GAP-7, and readiness claims remain blocked without separate exact approval.

## Week 3 Packet Prepared - 2026-05-19

A draft `A5-GAP-6` evidence-only aggregation approval packet has been prepared after readonly precheck evidence.

Packet: [docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_APPROVAL_PACKET.md](/A:/codex-memory/docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_APPROVAL_PACKET.md).

Status: `DRAFT_NOT_APPROVED`.

No aggregation execution occurred. Project status remains `NOT_READY_BLOCKED`.

## Week 3 Aggregation Result - 2026-05-19

`A5-GAP-6` evidence-only aggregation was exactly approved and executed for current HEAD `a1f54d6413fe0d1ee4d3ae1923b7bec4144aab9a`.

Evidence: [docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_EVIDENCE.md](/A:/codex-memory/docs/RC_PRECHECK_001_A5_GAP_6_AGGREGATION_EVIDENCE.md).

Result: `EVIDENCE_AGGREGATED_NOT_RC_READY`.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Local-Safe Prep - 2026-05-19

Phase F local-safe prep is recorded in [docs/PHASE_F_LOCAL_SAFE_PREP.md](/A:/codex-memory/docs/PHASE_F_LOCAL_SAFE_PREP.md).

Selected first next slice: `CM-0525 Phase F readonly VCP parity gap inventory`.

Allowed scope remains docs/fixtures/test-only hardening, readonly gap inventory, validation matrix refinement, observability/admin design draft, and memory governance proposal draft.

Blocked without new exact approval: runtime mutation, recall observation, provider calls, real memory broad scans, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, durable writes, push/tag/release/deploy/cutover, A5-GAP-7, and readiness claims.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Readonly Inventory - 2026-05-19

Readonly VCP parity gap inventory is recorded in [docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md](/A:/codex-memory/docs/PHASE_F_READONLY_VCP_PARITY_GAP_INVENTORY.md).

Selected next slice: `CM-0526 Phase F fixture/test-only parity hardening matrix`.

The inventory used existing docs only and did not inspect real memory stores, execute runtime, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Fixture/Test-Only Matrix - 2026-05-19

Fixture/test-only parity hardening matrix is recorded in [docs/PHASE_F_FIXTURE_TEST_ONLY_PARITY_HARDENING_MATRIX.md](/A:/codex-memory/docs/PHASE_F_FIXTURE_TEST_ONLY_PARITY_HARDENING_MATRIX.md).

Selected next slice: `CM-0529 Phase F TagMemo semantic association fixture plan`.

This slice only defines future fixture/test categories and did not add fixtures/tests, modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F TagMemo Fixture Plan - 2026-05-19

TagMemo semantic association fixture plan is recorded in [docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_PLAN.md](/A:/codex-memory/docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_PLAN.md).

Selected next slice: `CM-0530 Phase F TagMemo semantic association fixture tests`.

This slice only defines the future synthetic fixture/test contract and did not add fixtures/tests, modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F TagMemo Fixture Tests - 2026-05-19

Synthetic TagMemo semantic association fixture tests are recorded in [docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_TESTS.md](/A:/codex-memory/docs/PHASE_F_TAGMEMO_SEMANTIC_ASSOCIATION_FIXTURE_TESTS.md).

Added fixture: `tests/fixtures/phase-f-tagmemo-semantic-association-v1.json`.

Added targeted structure test: `tests/phase-f-tagmemo-semantic-association-fixture.test.js`.

This slice did not modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Controlled Query Expansion Negative Fixtures - 2026-05-19

Controlled query expansion negative fixtures are recorded in [docs/PHASE_F_TAGMEMO_CONTROLLED_QUERY_EXPANSION_NEGATIVE_FIXTURES.md](/A:/codex-memory/docs/PHASE_F_TAGMEMO_CONTROLLED_QUERY_EXPANSION_NEGATIVE_FIXTURES.md).

This slice extends the synthetic TagMemo fixture/test only and did not modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Deterministic Ordering Tie-Breaker Fixtures - 2026-05-19

Deterministic ordering tie-breaker fixtures are recorded in [docs/PHASE_F_TAGMEMO_DETERMINISTIC_ORDERING_TIE_BREAKER_FIXTURES.md](/A:/codex-memory/docs/PHASE_F_TAGMEMO_DETERMINISTIC_ORDERING_TIE_BREAKER_FIXTURES.md).

This slice extends the synthetic TagMemo fixture/test only and did not modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F TagMemo Fixture Pack Closeout - 2026-05-19

TagMemo fixture pack local closeout is recorded in [docs/PHASE_F_TAGMEMO_FIXTURE_PACK_LOCAL_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/PHASE_F_TAGMEMO_FIXTURE_PACK_LOCAL_CLOSEOUT_REVIEW.md).

The local synthetic fixture pack is complete with targeted test evidence `6/6`. Next selected slice: `CM-0534 Phase F observability/admin review surface design draft`.

This slice did not modify source/runtime, inspect real memory stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## Week 4 Phase F Observability/Admin Design Draft - 2026-05-19

Observability/admin review surface design draft is recorded in [docs/PHASE_F_OBSERVABILITY_ADMIN_REVIEW_SURFACE_DESIGN_DRAFT.md](/A:/codex-memory/docs/PHASE_F_OBSERVABILITY_ADMIN_REVIEW_SURFACE_DESIGN_DRAFT.md).

Selected next slice: `CM-0535 Phase F observability/admin review surface fixture plan`.

This slice did not modify source/runtime, start HTTP, run observe, inspect real memory/audit stores, run A5 commands, call providers, expand public MCP, mutate durable state, push, cut over, or claim readiness.

Project status remains `NOT_READY_BLOCKED`.

## CM-0535 Monthly Update

Phase F observability/admin review surface fixture plan prepared as a local-safe docs/board slice. It preserves the public MCP freeze and routes next work to a synthetic fixture/test contract only. Status remains NOT_READY_BLOCKED.

## CM-0536 Monthly Update

Phase F observability/admin review surface synthetic fixture contract added as local fixture/test-only work. It keeps public MCP tools frozen and preserves NOT_READY_BLOCKED.

## CM-0537 Monthly Update

Phase F memory governance proposal draft refreshed as design-only local work. It defines proposal/supersession/tombstone/forget-flow boundaries and keeps durable writes, real-store reads, public MCP expansion, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0538 Monthly Update

Phase F memory governance proposal fixture plan prepared as a local-safe docs/board slice. It keeps durable memory/audit writes, real-store reads, public MCP expansion, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0539 Monthly Update

Phase F memory governance proposal synthetic fixture contract added as local fixture/test-only work. It keeps durable writes, real-store reads, public MCP expansion, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0540 Monthly Update

Phase F governance/observability fixture packs closed locally as synthetic fixture/test evidence. Runtime gaps and A5 hard stops remain open; status remains NOT_READY_BLOCKED.

## CM-0541 Monthly Update

Phase F VCP parity fixture pack integration index prepared as a local-safe docs/board slice. It links TagMemo, observability/admin, and memory-governance fixture packs while keeping runtime parity, durable writes, real-store reads, public MCP expansion, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0542 Monthly Update

Phase F VCP parity fixture coverage gap review prepared as a local-safe docs/board slice. It selects LightMemo directory semantics fixture planning as the next safe target while keeping runtime parity, durable writes, real-store reads, public MCP expansion, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0543 Monthly Update

Phase F LightMemo directory semantics fixture plan prepared as a local-safe docs/board slice. It defines future synthetic coverage for maid/folder/alias/excluded-folder/all-KB behavior while keeping real LightMemo recall, real-store reads, public MCP expansion, durable writes, and readiness claims blocked. Status remains NOT_READY_BLOCKED.

## CM-0544 Monthly Update

Phase F LightMemo directory semantics synthetic fixture contract added as local fixture/test-only work. It keeps real LightMemo recall, real-store reads, public MCP expansion, durable writes, and readiness claims blocked. Status remains NOT_READY_BLOCKED.
