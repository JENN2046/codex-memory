# Documentation Update Plan

## README

Required change:

```yaml
from:
  - independent implementation not relying on VCPToolBox runtime
to:
  - VCP-native-first governed memory bridge for Codex / Claude
  - VCPToolBox owns memory intelligence
  - codex-memory owns governance and fallback/audit/compatibility
```

Must preserve:

- current safety restrictions;
- fixture-only/live-proof distinction;
- no production/release/cutover claim;
- current tool reality.

## STATUS

Required change:

- sync current task/validation with selected source-of-truth;
- preserve committed snapshot caveat;
- state that no live VCP proof exists unless later evidence says otherwise;
- point next phase to M0-M3 bridge alignment, not old parity continuation.

## CURRENT_STATE

Required change:

- refresh task/validation IDs;
- state live git facts require fresh commands;
- add VCP-native-first route summary;
- list active drift resolution tasks.

## Roadmap

Recommended disposition:

```yaml
ROADMAP.md:
  treatment: keep_archived
  action: add or preserve archived warning; do not use as active route

docs/VCP_MEMORY_PARITY_ROADMAP.md:
  treatment: downgrade_to_legacy_fallback_compatibility_reference
  action:
    - add banner
    - move local parity items under fallback/test/compatibility lane
    - stop calling it source of truth for primary route

docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md:
  treatment: create_new_primary
  action:
    - define M0-M15 route
    - link approval/autonomy model
    - link VCP capability inventory
```

## Taskbook

Required change:

- update `.agent_board/TASK_QUEUE.md` to make first active tasks M0-M2;
- avoid live VCP tasks in first three;
- label future live tasks exact-approval-bound.

## AGENTS / governance docs

Required change:

- add bounded autonomous approval model;
- define L4 hard stops;
- define Jenn-required boundary expansions;
- define audit receipts and low-disclosure output requirements.

## Receipts

Required future receipt files:

```yaml
receipts:
  - reality_calibration_receipt
  - strategy_pivot_decision_receipt
  - docs_sync_receipt
  - capability_inventory_receipt
  - approval_boundary_template_receipt
  - observe_lite_receipt
  - read_shape_receipt
  - trusted_full_read_receipt
  - write_proposal_receipt
  - bounded_write_receipt
```

## Do not update yet

Do not update implementation code, runtime config, client config, public MCP tools, provider settings, deployment files, tags, releases, or production labels as part of M0-M2.
