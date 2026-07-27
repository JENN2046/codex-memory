# VALIDATION_LOG.md - codex-memory

> Non-authoritative validation surface. Current work authority remains
> `CURRENT_STATE.md`.

Keep the established eight-column table because the dashboard, Smart Standing
receipt parser, and read-only controller consume this shape. Retain only the
validation bound by `CURRENT_FACTS.lastCompleted`.

| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |
|---|---|---|---|---|---|---|---|
| CMV-2240 | `node --check` validators; targeted `node --test`; `bash scripts/validate-local.sh docs`; `npm test -- --summary`; history recovery checks; `git diff --check` | P0-mainline-health / P6-docs-drift / P8-memory-governance | CM-2155 codex-memory governance surface reset | COMPLETED_VALIDATED | Schema v5, rotatable `lastCompleted`, product-baseline, and blocker bindings, strict active-only queue binding, malformed-row rejection across active tables, compact authority surfaces, parser compatibility, legacy v5 rejection, and fixed Git history recovery validated. Green Lane `not_required_no_amber_external_or_write_action`; no runtime, provider, memory, config, dependency, public MCP, release, deploy, or readiness action occurred. | Jenn selects the next product goal; keep the queue empty until that selection is recorded in `CURRENT_STATE.md`. | 2026-07-27 |
