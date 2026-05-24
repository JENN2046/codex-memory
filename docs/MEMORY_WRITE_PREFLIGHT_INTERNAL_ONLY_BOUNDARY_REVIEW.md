# Memory Write Preflight Internal-Only Boundary Review

Status: `MEMORY_WRITE_PREFLIGHT_INTERNAL_ONLY_BOUNDARY_REVIEW_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0894` bounded source read-only review over the current opt-in write-preflight app path after `CM-0893`

## Review Input

Reviewed artifacts:

- `src/core/MemoryWriteService.js`
- `src/storage/SqliteShadowStore.js`
- `src/config/createConfig.js`
- `src/app.js`
- `tests/phase-a-services.test.js`
- `tests/memory-write-preflight-app-temp-local-evidence.test.js`
- `docs/MEMORY_WRITE_PREFLIGHT_CANDIDATE_SOURCE_REVIEW.md`
- `docs/MEMORY_WRITE_PREFLIGHT_EXACT_SCOPE_CANDIDATE_SOURCE_HELPER.md`
- `docs/MEMORY_WRITE_PREFLIGHT_APP_WIRING.md`
- `docs/MEMORY_WRITE_PREFLIGHT_APP_TEMP_LOCAL_EVIDENCE.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `STATUS.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`

This review does not execute true live `record_memory`, true live `search_memory`, provider calls, broad real-memory scans, direct `.jsonl` reads, durable memory/audit writes outside isolated validation harnesses, public MCP expansion, package/config/watchdog/startup changes, push, release, deploy, cutover, or readiness claims.

## Decision

The current opt-in write-preflight application path should still be treated as internal-only.

`CM-0891` through `CM-0893` have now established three useful facts:

- one exact-scope internal candidate-source helper exists;
- one default-disabled app-level provider wiring exists;
- one stronger isolated temp-local app-path evidence slice exists.

That is enough to treat the path as a real bounded internal seam.

It is not enough to reclassify the path as default runtime behavior, public write reliability, or a readiness-bearing write lane.

## Findings

### 1. This path is not a separate internal runtime-entry family

Accepted.

Unlike `validate`, `tombstone`, and `supersede`, write preflight currently does not live behind:

- a dedicated internal runtime-entry method;
- approved-context execution gating;
- one-shot explicit internal invocation semantics.

Instead, the current seam is:

- the normal public `record_memory` path;
- plus a config flag;
- plus an internal candidate provider.

That difference matters because enabling the seam changes the behavior of the normal write path itself.

### 2. Enabling the seam changes public-path write semantics, even though public MCP shape stays frozen

Accepted.

Current repository reality keeps public MCP shape unchanged:

- `TOOL_DEFINITIONS` still expose only:
  - `memory_overview`
  - `record_memory`
  - `search_memory`
- `callTool()` still exposes only those same three tools.

But when `enableWritePreflight=true`, the normal public `record_memory` path can now reject a write before projection for duplicate/idempotence reasons.

So the surface has not widened, but the behavior of an already-public path can change when the flag is enabled.

That is exactly why this path should still be treated as internal-only and opt-in rather than as ambient default runtime behavior.

### 3. The current activation mechanism is environment-level, not per-request exact approval

Accepted.

Current activation is controlled by:

- `createConfig().enableWritePreflight`
- default `false`
- process/env/constructor override when explicitly enabled.

That means the current seam is safer than a default-on runtime path, but coarser than:

- one approved internal runtime-entry call;
- one exact per-request execution packet;
- one dedicated proof runner.

So the right interpretation is:

- bounded internal app/runtime seam;
- not default behavior;
- not exact-approved live proof machinery by itself.

### 4. Current evidence is stronger, but still isolated and indirect

Accepted.

`CM-0893` proves the app path over real local classes in isolated temp directories:

- same-scope duplicate suppression happens before second durable projection;
- same-content out-of-scope writes still persist separately;
- audit sequencing is correct for the bounded temp-local harness.

What it still does not prove:

- current real-store duplicate suppression against existing real data;
- operator-safe live proof procedure;
- long-run idempotence across current working memory state;
- default-on runtime behavior;
- `memory write reliable`.

So this is stronger local evidence, not live proof.

### 5. Future live proof should consume this exact seam, not invent a parallel one

Accepted.

The existing bounded path is already the right future consumption candidate:

- normal `createCodexMemoryApplication()`
- normal `callTool('record_memory', ...)`
- existing exact-scope candidate provider
- explicit `enableWritePreflight=true`

If a future separately exact-approved live write proof is chosen, the smallest aligned route is to consume this exact seam under a tightly bounded execution packet.

That is preferable to:

- inventing a second duplicate-suppression runtime path;
- bypassing the existing app wiring;
- widening public MCP;
- or silently making preflight default-on.

### 6. The correct current boundary is “internal-only opt-in seam, future live-proof candidate”

Accepted.

The current write-preflight app path should therefore be described as:

- internal-only in operational meaning;
- opt-in by explicit local configuration;
- stronger than helper-only;
- stronger than app-surface smoke;
- still below live proof;
- still below default runtime behavior;
- still below `memory write reliable`.

## Why This Still Cannot Claim Memory Write Reliable

`CM-0894` is review only.

Even after `CM-0893`, current evidence still does not prove:

- default runtime duplicate suppression;
- true live duplicate suppression against current real store state;
- durable write-path reliability under current working data;
- readiness-bearing write behavior.

Therefore:

- `memory write reliable` remains unclaimed;
- `complete? = no` remains the only safe interpretation;
- `RC_NOT_READY_BLOCKED` remains unchanged.

## Next Best Gap

The next best gap is no longer “should we widen this path now”.

The better next step is:

- keep the current seam internal-only;
- and, only if later selected, prepare one separately exact-approved live write proof packet that consumes this existing opt-in app path rather than inventing a new one.

That is preferable to:

- enabling write preflight by default;
- creating a second parallel runtime path;
- widening public MCP;
- or treating temp-local evidence as live proof.

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_INTERNAL_ONLY_BOUNDARY_REVIEW_COMPLETED_NOT_READY`.

`CM-0894` fixes the interpretation of the current write-side seam:

- stronger than helper-only;
- stronger than app-surface smoke;
- still internal-only in operational meaning;
- still opt-in;
- still not default runtime behavior;
- still not live proof;
- still not `memory write reliable`.

No reliability, readiness, release, production, V8, or VCP full-parity claim is made.

`RC_NOT_READY_BLOCKED` remains.
