# CM-0549 HTTP Session Hardening Design

Status: DESIGN_PACKET_READY_FOR_REVIEW_PATCHED
Decision: CM_0549A_DESIGN_PACKET_READY_FOR_REVIEW
Mode: A4 local docs/design only
Risk: low
Scope: HTTP MCP session TTL / max sessions / max streams / cleanup design packet

## Purpose

This packet defines a safe design boundary and test matrix for future HTTP MCP session hardening.

The target hardening area is long-running HTTP session protection:

- `CODEX_MEMORY_HTTP_SESSION_TTL_MS`
- `CODEX_MEMORY_HTTP_MAX_SESSIONS`
- `CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION`
- `CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS`
- `CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS`
- periodic idle cleanup

This packet is design-only. It does not modify runtime code, tests, package files, config, provider settings, HTTP services, durable memory, or runtime data.

## Current Review Context

Recent review conclusion: `PASS_WITH_PATCH_RECOMMENDED`.

Accepted follow-up:

- P1 current runtime gap truth table consolidation: completed in `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`.
- P2 HTTP session TTL / cap / cleanup: this packet.

## Non-Goals

This packet does not authorize or implement:

- changes to `src/adapters/codex-mcp/http.js`
- test file changes
- HTTP service startup
- live HTTP observation
- provider calls
- real memory scans
- durable memory or audit writes
- dependency/package changes
- config/watchdog/startup changes
- public MCP expansion
- push, tag, release, deploy, or RC cutover
- readiness claims

## Proposed Runtime Guard Concepts

The future runtime implementation should be small and fail-closed.

### Defaults And Ranges

Future implementation should use these exact defaults and accepted ranges:

| setting | default | allowed range | env key |
|---|---:|---:|---|
| absolute session TTL | 30 minutes | 5 minutes to 24 hours | `CODEX_MEMORY_HTTP_SESSION_TTL_MS` |
| idle session TTL | 10 minutes | 1 minute to 2 hours | `CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS` |
| max sessions | 64 | 1 to 256 | `CODEX_MEMORY_HTTP_MAX_SESSIONS` |
| max streams per session | 8 | 1 to 32 | `CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION` |
| cleanup interval | 60 seconds | 10 seconds to 5 minutes | `CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS` |

Invalid, non-numeric, non-positive, or out-of-range values must fall back to the default and emit warning metadata. Startup must not crash because of invalid hardening env values. The implementation must not silently clamp out-of-range values because silent clamping hides operator mistakes.

### Session TTL

Design variable:

```text
CODEX_MEMORY_HTTP_SESSION_TTL_MS
```

Purpose:

- Bound maximum lifetime for an HTTP MCP session using `createdAt`.
- Bound idle lifetime for an HTTP MCP session using `lastSeenAt`.
- Expire sessions even if stream references are not explicitly closed.
- Prefer conservative defaults and safe parsing.

Suggested semantics:

- Missing value: use the exact default from the defaults table.
- Invalid, non-numeric, non-positive, or out-of-range value: fall back to the exact default and emit warning metadata.
- Do not crash startup because of invalid hardening env values.
- Do not silently clamp; fallback plus warning is required.
- Absolute TTL expiry is based on `createdAt + absoluteTtlMs`.
- Idle TTL expiry is based on `lastSeenAt + idleTtlMs`.
- A session is removable when either absolute TTL or idle TTL has expired.

### Max Sessions

Design variable:

```text
CODEX_MEMORY_HTTP_MAX_SESSIONS
```

Purpose:

- Cap total active session entries.
- Prevent unbounded growth in long-running local desktop use.

Suggested semantics:

- If cap is reached, reject new session creation with HTTP `429` and a clear local error envelope.
- Do not evict an active session silently unless a specific future policy says so.
- Expired/idle sessions should be cleaned before applying the cap.

### Max Streams Per Session

Design variable:

```text
CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION
```

Purpose:

- Cap stream handles associated with a single session.
- Prevent one session from accumulating unbounded stream entries.

Suggested semantics:

- If stream cap is reached, reject additional stream registration for that session with HTTP `429` and a clear local error envelope.
- Cleanup closed/expired stream records before counting if the implementation can do so safely.
- Error should not expose sensitive request data.
- Error shape should include `error`, `code`, `message`, and `meta` fields.

### Periodic Cleanup

Purpose:

- Remove expired sessions.
- Remove closed/expired stream handles.
- Keep cleanup local, deterministic, and bounded.

Suggested semantics:

- Cleanup interval should use the exact default/range from the defaults table.
- Cleanup should not perform provider calls, memory reads, memory writes, or MCP tool execution.
- Cleanup should be safe to run repeatedly.
- Cleanup should stop or be unreferenced cleanly when the HTTP server shuts down.
- Cleanup timer should call `unref()` when supported so it does not keep the process alive.

## Cap Error Shape

Cap rejections should use HTTP `429` with a sanitized local error envelope.

Required fields:

```json
{
  "error": "session_limit_exceeded",
  "code": "HTTP_SESSION_LIMIT_EXCEEDED",
  "message": "HTTP session limit exceeded",
  "meta": {
    "limitType": "sessions",
    "limit": 64
  }
}
```

For stream cap rejections, `limitType` should be `streams_per_session` and `code` should be `HTTP_SESSION_STREAM_LIMIT_EXCEEDED`.

The envelope must not include raw env values, raw requests, authorization headers, bearer tokens, cookies, filesystem paths, provider keys, or memory content.

## Proposed Test Matrix

Future tests should be fixture/local unit tests first.

| area | scenario | expected result | forbidden side effects |
|---|---|---|---|
| TTL parse | missing env | safe default selected | no service start, no config write |
| TTL parse | invalid env | exact default plus warning metadata | no startup crash, no silent clamp |
| TTL parse | zero/negative env | exact default plus warning metadata | no startup crash, no silent clamp, no immortal session |
| max sessions | below cap | session accepted | no provider/memory operation |
| max sessions | exactly at cap | session accepted | no provider/memory operation |
| max sessions | cap plus one | new session rejected with HTTP 429 error envelope | no silent runtime mutation beyond bookkeeping |
| max sessions | cleanup after expiry then create | new session accepted after expired entry removal | no provider/memory operation |
| stream cap | below cap | stream accepted | no provider/memory operation |
| stream cap | exactly at cap | stream accepted | no provider/memory operation |
| stream cap | cap plus one | stream rejected with HTTP 429 error envelope | no secret/raw request echo |
| stream cap | stream close decrements count | next stream registration accepted | no provider/memory operation |
| cleanup | expired session present | expired session removed | no MCP tool execution |
| cleanup | active session present | active session preserved | no provider/memory operation |
| cleanup | repeated calls | idempotent result | no data loss outside session maps |
| shutdown | cleanup timer exists | timer disposed on server close | no lingering process blocker |
| shutdown | runtime supports timer unref | timer `unref()` called | no process keepalive from cleanup timer |
| observe/admin | hardening fields exposed if added later | sanitized counts/settings only | no secret/env raw value output |

## Acceptance Criteria For Future Implementation

A future implementation should not be considered complete unless:

- Absolute session TTL and idle session TTL exist and are tested.
- Max session cap exists and is tested.
- Max streams per session exists and is tested.
- Cleanup is deterministic, removes absolute or idle expired sessions, clears on server close, and calls timer `unref()` when supported.
- Error envelopes are safe and do not leak secrets.
- Existing HTTP MCP behavior remains compatible for normal requests.
- Public MCP tools remain frozen unless a separate approved phase expands them.
- Validation includes targeted HTTP tests and appropriate mainline gate selection.

## Stop Conditions

Stop before implementation if any of these are true:

- The change requires modifying public MCP tool schema.
- The change requires config/watchdog/startup installation.
- The change requires provider calls.
- The change requires real memory store reads or writes.
- The change requires package/dependency changes.
- The change would alter auth/token semantics beyond local session resource limits.
- The change cannot be tested without starting a long-running service.
- The implementation scope expands beyond `src/adapters/codex-mcp/http.js` and narrowly related tests without a fresh plan.

## Future Minimal Implementation Plan

1. Inspect current HTTP session/stream data structures.
2. Add pure parsing helpers for TTL/session/stream limits.
3. Add deterministic cleanup helper with injectable clock.
4. Wire helpers into HTTP session creation/stream registration.
5. Add targeted unit tests for parsing, caps, cleanup, and error shape.
6. Run targeted HTTP tests.
7. Run broader gate only if runtime behavior or MCP contract risk justifies it.

## Current Decision

`CM_0549A_DESIGN_PACKET_READY_FOR_REVIEW`

The design is ready for review. Runtime implementation remains blocked until a later scoped implementation task is explicitly selected.
