# VALIDATION_LOG.md - codex-memory

> Non-authoritative validation surface. Current work authority remains
> `CURRENT_STATE.md`.

Keep the established eight-column table because the dashboard, Smart Standing
receipt parser, and read-only controller consume this shape. Retain only the
validation bound by `CURRENT_FACTS.lastCompleted`.

| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |
|---|---|---|---|---|---|---|---|
| CMV-2242 | `node --check`; targeted `node --test`; import-fence validator; current-facts and ledger validators; `bash scripts/validate-local.sh docs`; `npm test -- --summary`; `git diff --check` | P0-mainline-health / P6-docs-drift / P8-memory-governance | CM-2157 canonical Relay observer wiring source-only | COMPLETED_VALIDATED | Canonical Relay construction injects the low-disclosure observer and brackets an exact-request, owner-only `0600`, read-only UDS snapshot surface. Exact-key projection, disclosure drift, invalid requests, permissive or symlinked parents, missing configuration, unsafe authority before secret-bound loader, listener import-fence drift, and lifecycle behavior passed with synthetic temporary fixtures. Amber receipt recorded for the Yellow local source/security batch; no real private-config write, real runtime start, provider/MCP call, memory read/write, dependency/CI/public-MCP change, release, deploy, or readiness claim occurred. | Jenn selects the next product goal; real private exact-head runtime verification remains a separate P3-gated action. | 2026-07-28 |
