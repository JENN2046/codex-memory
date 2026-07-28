# RUN_STATE.md - codex-memory

> Non-authoritative pointer. Use `CURRENT_STATE.md` for all current work.

## Summary

- Project: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`
- Active task: `CM-2159`
- Last completed: `CM-2158 / CMV-2243`
- Queue state: one `in_progress` source-only row
- Next transition: implementation PR, then separately authorized schema-v6 runtime adoption

PR `#65` delivered the governed full-stack controller. The exact-authorized V5
transition completed at baseline `48ecfe1c…` and adopted one owner-only,
reference-only schema-v5 controller profile. PR `#66` then changed only
governance surfaces, so the exact whole-HEAD source gate no longer matches even
though runtime-critical bytes did not change.

`CM-2159` replaces that gate with a fixed runtime-source manifest and preserves
schema-v4/v5 read/stop compatibility. This phase does not authorize `status`,
service lifecycle, provider/config access, or profile replacement.

Fresh branch, HEAD, ahead/behind, PR, and CI facts must be queried live and are
not stored here. Current runtime health also requires a separately authorized
low-disclosure inspection.

History: `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
