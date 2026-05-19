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
