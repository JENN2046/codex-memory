# CM-1658 Record Memory Strict Auth Stage 1 Observe-Only Evidence

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_STRICT_AUTH_STAGE1_OBSERVE_ONLY_EVIDENCE_NO_ENABLEMENT`

## Scope

This slice advances the safe production strict auth path by adding HTTP MCP stage 1 observe-only evidence for `record_memory` with a complete env policy.

Stage 1 observe-only is not strict enforcement. It must not reject intended writes. It exists to prove that a complete trusted env/profile policy can be loaded and that mismatches can be observed without changing current write behavior.

## Added Evidence

Expanded `tests/mcp-http.test.js` with:

```text
CM1658 HTTP MCP observe-only complete policy records mismatch without rejecting
```

The test sets a complete trusted env/profile policy:

- trusted runtime context has all six fields
- strict auth policy has all six allowlist groups
- `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=observe`
- trusted `workspaceId` / `clientId` intentionally mismatch allowlist
- payload scope carries allowed-looking `project_id`, `workspace_id`, and `client_id`

Verified behavior:

- HTTP MCP loads effective mode `observe`
- write service strict mode remains `false`
- authenticated `record_memory` succeeds
- public response does not expose `principalScopeAuthorization`
- public response does not echo mismatched trusted `workspaceId` or `clientId`

## Production Meaning

This is a local stage 1 evidence pattern. It proves the observe-only candidate keeps writes flowing under a complete policy even when strict mode would reject the same trusted context.

This does not prove production readiness. A production stage 1 rollout still needs operator-owned real env/profile values, exact target runtime, rollout window, monitoring/readout surface, rollback path, and separate approval for any production config/startup change.

## Boundaries

- `.env` edit: `NO`
- runtime default changed: `NO`
- strict enforcement enabled: `NO`
- startup/watchdog/config changed: `NO`
- provider/API called: `NO`
- raw/broad memory scan: `NO`
- public MCP expansion: `NO`
- push/PR/release/deploy/cutover: `NO`
- production/release/cutover ready: `NO`
- complete V8 claimed: `NO`

## Validation

Passed:

```text
node --test tests\mcp-http.test.js
node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:mainline
```

Result:

```text
HTTP MCP: 32 passed / 0 failed
principal/scope config + integration: 21 passed / 0 failed
diff whitespace check: passed
docs validation: passed
mainline gate: passed; health ok; compare 43/43; rollback 43/43
```

## Required Follow-Up

- Stage 1 production observe rollout still requires exact operator approval before editing real env/profile or startup configuration.
- Stage 1 needs a bounded readout method for missing/mismatch counts that stays low-disclosure.
- Stage 3 local HTTP/stdio strict runtime candidate remains separate work.
- Default production strict enablement remains separate exact-approval scope.
