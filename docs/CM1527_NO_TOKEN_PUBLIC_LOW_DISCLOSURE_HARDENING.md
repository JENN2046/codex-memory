# CM-1527 No-Token Public Low-Disclosure Hardening

## Scope

Task: `CM-1527 source hardening for no-token low-disclosure and memory_overview projection metadata`.

Goal: harden the public no-token and rejection response paths after the CM-1524 live client proof finding. This is a local source/test/docs hardening slice only.

## Changes

- No-token public HTTP rejection payloads now use a generic low-disclosure shape:
  - `error: Forbidden`
  - `status: rejected`
  - `reason: blocked`
  - JSON-RPC rejection data code `PUBLIC_REQUEST_BLOCKED`
- No-token JSON-RPC guards no longer return reason strings that mention token, mutation, search, content type, origin, provider, API, raw, lifecycle, mutation, or client-boundary metadata.
- `memory_overview` public selected projection metadata now uses `selectedProjectionVersion: 2`, `mode: public_selected_overview`, `publicAccess: blocked`, and `detailFieldsReturned: false`.
- Public selected `memory_overview` no longer exposes raw/private/lifecycle/mutation/client-boundary metadata through the public access projection.
- Regression tests now assert low-disclosure no-token rejection and `memory_overview` projection behavior.

## Regression Coverage

Targeted command:

```powershell
node --test tests\memory-overview-no-token-selected-projection.test.js tests\mcp-http.test.js tests\http-no-token-search-rejection.test.js tests\phase-f1-live-client-no-write-runner.test.js
```

Result: `43/43` passed.

Covered boundaries:

- no-token `record_memory` rejection is generic low-disclosure
- no-token `search_memory` rejection is generic low-disclosure
- browser-origin and simple-content-type no-token POST rejections do not disclose boundary details
- no-token `memory_overview` returns selected safe overview metadata only
- public MCP surface remains the expected seven tools in the covered contract tests
- Phase F1 no-write evidence runner expects `PUBLIC_REQUEST_BLOCKED` and selected projection v2

## Boundary Confirmation

CM-1527 did not:

- execute a live client call
- call provider/API
- use bearer-token material
- perform raw memory/audit/broad scan
- execute an effective `record_memory` write
- execute confirmed mutation
- use `dry_run=false` or `confirm=true` mutation
- expand the public MCP surface
- release/tag/deploy
- claim readiness or `RC_READY`
- close the live client evidence blocker
- close the effective write reliability blocker

## Blocker Status

Live client evidence blocker remains `STILL_OPEN` pending a future proof retry or separate closeout after refreshed evidence.

Effective write reliability blocker remains `OPEN / DEFERRED`.

Overall status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`; `RC_READY` remains `BLOCKED`.

## Changed-Scope Review

Changed-scope review found no actionable issue in the modified no-token rejection, public `memory_overview` projection, and Phase F1 evidence-runner test scope. Historical diagnostic surfaces that reference older no-token rejection names were not changed because they are not the current public runtime response path.
