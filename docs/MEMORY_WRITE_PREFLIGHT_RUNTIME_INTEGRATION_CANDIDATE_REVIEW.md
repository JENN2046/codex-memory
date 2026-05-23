# Memory Write Preflight Runtime Integration Candidate Review

Date: 2026-05-23
Task: CM-0837
Status: MEMORY_WRITE_PREFLIGHT_RUNTIME_INTEGRATION_CANDIDATE_REVIEW_COMPLETED_NOT_READY
Scope: source read-only review plus docs/board/status/truth-table update

## Boundary

This review evaluates whether the CM-0836 bounded write lifecycle / dedup / suppression preflight is a viable candidate for future runtime integration.

It does not integrate the helper into `MemoryWriteService`, execute true live `record_memory`, execute true live `search_memory`, read real memory content, read `.jsonl` / durable memory content, call providers, write durable memory/audit, expand public MCP, change package/config/watchdog/startup, push, release, deploy, cut over, or claim readiness.

## Reviewed Surfaces

- `src/core/MemoryWriteService.js`
- `src/core/MemoryWriteLifecycleDedupSuppressionPreflight.js`
- `tests/memory-write-reliability-proof-matrix-fixture.test.js`
- `tests/memory-write-reliability-temp-local-evidence.test.js`
- `tests/memory-write-lifecycle-dedup-suppression-preflight.test.js`
- `src/app.js` service wiring around `record_memory`

## Current Runtime Write Path

`MemoryWriteService.record()` currently performs these relevant steps:

1. resolve execution context;
2. reject non-Codex writable context;
3. reject schema/version metadata;
4. reject invalid target and missing title/content/evidence;
5. reject secret-like payloads and high-risk sensitivity;
6. reject unvalidated / non-reusable knowledge;
7. reject malformed process memory;
8. write diary;
9. project to SQLite shadow / vector / chunks with degraded accounting;
10. append write audit.

This means a future preflight integration candidate must run after basic payload normalization and existing validation, but before diary write. It must not replace current validation or audit semantics.

## Candidate Verdict

CM-0836 is a viable future runtime integration candidate only under these constraints:

- integration is opt-in / internally configured first, not public MCP schema expansion;
- candidate duplicate summaries are supplied by an approved bounded index or exact lookup, not by broad real-memory scan;
- exact allowed scope is derived from resolved request/runtime context, not trusted blindly from user payload;
- helper result is mapped to existing rejected write result shape and normal write audit, without raw candidate content output;
- lifecycle actions remain exact-approval-only and do not mutate supersession/tombstone/forget state in this step;
- default accepted write semantics remain unchanged unless duplicate/scope/pollution/lifecycle blockers are proven;
- tests must show rejection occurs before diary/shadow/vector/chunk projection;
- no readiness or `memory write reliable` claim follows from integration alone.

## Minimum Future Implementation Scope

The smallest safe implementation slice would be:

1. Add optional constructor dependencies to `MemoryWriteService`:
   - `writePreflight`
   - `writePreflightCandidateProvider`
   - `writePreflightEnabled`
2. Derive an internal allowed scope from normalized payload plus resolved execution context.
3. Ask the candidate provider only for bounded candidate summaries for the exact scope and canonical hash family.
4. Call `summarizeMemoryWriteLifecycleDedupSuppressionPreflight()`.
5. If rejected, return `buildRejectedResult(preflight decision/reason)` and append normal rejected write audit.
6. If accepted, continue existing write path unchanged.
7. Add targeted tests proving:
   - duplicate active candidate rejects before diary/shadow/vector/chunk;
   - scope mismatch rejects before diary/shadow/vector/chunk;
   - schema/version and secret rejection remain covered by existing runtime guards;
   - lifecycle action without exact approval rejects before write;
   - candidate provider failure fails closed before write;
   - helper disabled preserves existing current behavior.

## Non-Goals For Next Slice

- no public MCP schema changes;
- no true live write execution;
- no durable lifecycle mutation;
- no real memory scan;
- no provider call;
- no rollback apply;
- no migration/import/export/backup/restore apply;
- no RC/runtime/production readiness claim.

## Remaining Gaps

Even if the future integration slice passes, these remain open:

- true live accepted-write reliability;
- durable lifecycle proposal / approval / supersession / tombstone / forget mutation;
- robust duplicate candidate source backed by bounded indexes;
- rollback cleanup posture for real writes;
- long-run durability;
- VCP full parity.

## Closeout

CM-0837 accepts CM-0836 as a candidate for a future minimal runtime integration slice, not as completed runtime enforcement.

`memory write reliable` remains exact approval required and not claimed. Runtime ready, RC ready, production ready, V8 implemented, and VCP full parity remain not claimed.

Controlling state remains `RC_NOT_READY_BLOCKED`; no row changes to `complete? = yes`.
