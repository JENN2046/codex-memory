# Codex / Claude Client Integration Runbook

Status: Phase H no-apply runbook and acceptance preflight.

This document describes the client integration path for `codex-memory` without
executing it. It is a local source/test slice, not a runtime acceptance record.

## Boundary

Allowed in this slice:

- Document the Codex and Claude HTTP MCP integration shape.
- Model acceptance preflight with explicit fixture input.
- Verify client-scope private-read acceptance with source tests.
- Keep public MCP tools frozen to `record_memory`, `search_memory`, and
  `memory_overview`.

Not allowed in this slice:

- Edit real Codex or Claude config.
- Read, print, persist, or depend on bearer token material.
- Run `tools/call`.
- Execute `record_memory`, `search_memory`, or `memory_overview`.
- Start, stop, or modify runtime, watchdog, scheduled task, or startup state.
- Call providers.
- Write durable memory, audit, diary, SQLite, vector index, or candidate cache.
- Claim `RC_READY`, cutover readiness, or live client acceptance.

## Recommended Runtime Shape

The recommended client transport remains HTTP MCP over loopback:

```text
http://127.0.0.1:7605/mcp/codex-memory
```

The health URL for a later live check is:

```text
http://127.0.0.1:7605/health
```

The service identity expected by clients is:

```text
vcp_codex_memory
```

## Codex Template

Codex should use the HTTP MCP endpoint when a real config change is explicitly
approved. This runbook intentionally does not write `%USERPROFILE%\.codex`,
`$HOME/.codex`, or any user-specific client config.

Template only:

```toml
[mcp_servers.codex-memory]
url = "http://127.0.0.1:7605/mcp/codex-memory"
```

Do not add bearer token material to the template in this slice.

## Claude Template

Claude should also target the same HTTP MCP endpoint when a real client
registration is explicitly approved.

Command shape only:

```powershell
claude mcp add --transport http codex-memory http://127.0.0.1:7605/mcp/codex-memory
```

Do not run this command in this slice. It can write user-level Claude MCP
registration state.

## Acceptance Preflight

The local acceptance preflight is fixture-only and no-apply. It accepts only
when all of the following are true:

- `sourceMode` is `explicit_input`.
- Required clients are exactly covered: `codex` and `claude`.
- Each client uses HTTP transport and the loopback MCP URL above.
- Codex config template is documented without writing real config.
- Claude command template is documented without running `claude mcp add`.
- Health probe path is documented, but not executed by this slice.
- Rollback path is documented for any future config change.
- No token use, token print, or token persistence is present.
- No MCP `tools/call` or memory tool execution is present.
- No provider calls, durable writes, config changes, watchdog/startup changes,
  or readiness claims are present.
- Public MCP tools remain frozen to `record_memory`, `search_memory`, and
  `memory_overview`.
- The Phase H client-scope private-read preflight is accepted.

Source helper:

```text
src/core/ClientIntegrationAcceptancePreflight.js
```

Targeted test:

```text
tests/client-integration-acceptance-preflight.test.js
```

## Client-Scope Acceptance

The client-scope boundary remains:

- Current lifecycle identity comes from the execution context.
- Caller scope is only a candidate filter.
- Same-client private recall can be accepted.
- Cross-client private recall is suppressed.
- Ownerless private candidates fail closed.
- Missing request identity fails closed.
- Suppressed private metadata is sanitized.

This slice reuses the accepted CM-1400 source/test helper and does not query
real memory.

## Later Live Validation

Later live validation requires a new explicit approval package before any
side-effectful action. That package should name the exact commit, endpoint,
allowed client commands, allowed read-only memory operation if any, token rule,
rollback path, and validation commands.

Live validation must keep these facts separate:

- A documented template is not a config mutation.
- A source/test preflight is not runtime freshness.
- A runtime health result is not memory tool acceptance.
- A readonly memory tool result is not durable write readiness.
- Historical Claude or Codex evidence is stale-sensitive and cannot be reused as
  current readiness.

## Rollback

For this no-apply slice, rollback is deleting the new source/test/runbook files
or reverting the local commit before push.

For any future approved real client config change, rollback must be written
before execution and must identify the exact client config entry to remove or
restore. Use revert-by-new-commit for any pushed cutover artifact.

## Failure Criteria

The preflight must fail closed on:

- Unknown client.
- Non-HTTP transport.
- Non-loopback or wrong MCP URL.
- Missing Codex or Claude template documentation.
- Missing health probe documentation.
- Missing rollback documentation.
- Missing no-config, no-token, or no-memory-tool boundary documentation.
- Real client config mutation.
- Watchdog or startup mutation.
- Bearer token use or token-like material in explicit input.
- Live client command execution.
- MCP `tools/call` or memory tool execution.
- Provider call.
- Durable write.
- Public MCP tool drift.
- Missing client-scope private-read acceptance.
- Readiness or `RC_READY` claim.
