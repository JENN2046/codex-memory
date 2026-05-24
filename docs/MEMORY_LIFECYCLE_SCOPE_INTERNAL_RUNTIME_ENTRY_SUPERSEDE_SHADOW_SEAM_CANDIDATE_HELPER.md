# MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_SHADOW_SEAM_CANDIDATE_HELPER

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_RUNTIME_ENTRY_SUPERSEDE_SHADOW_SEAM_CANDIDATE_HELPER_COMPLETED_NOT_READY`

## Purpose

`CM-0991` takes the next smallest safe step after `CM-0990`.

`CM-0990` already turned supersede pair semantics into a reusable blocked runtime-prep helper.

What still remained too abstract was the exact future seam candidate shape that a real two-record shadow-store implementation would have to honor:

- one exact pair apply method name
- one exact pair guard bundle
- one exact pair audit-correlation bundle
- one exact blocked carry-forward from runtime-prep into seam discussion

This slice still does not implement a two-record seam.

It only turns the blocked supersede runtime-prep chain into a reusable blocked seam-candidate helper.

## Implemented Surface

Added:

- [MemorySupersedeShadowSeamCandidateHelper.js](/A:/codex-memory/src/core/MemorySupersedeShadowSeamCandidateHelper.js)
- [memory-supersede-shadow-seam-candidate-request-v1.json](/A:/codex-memory/tests/fixtures/memory-supersede-shadow-seam-candidate-request-v1.json)
- [memory-supersede-shadow-seam-candidate-helper.test.js](/A:/codex-memory/tests/memory-supersede-shadow-seam-candidate-helper.test.js)

The helper now consumes:

- the `CM-0989` two-record seam contract
- the `CM-0990` supersede runtime-prep shape
- the same explicit dry-run / projection / runtime-capability inputs already used by runtime-prep

and emits one coherent internal-only supersede shadow-seam candidate.

## What The Helper Fixes

The helper now makes the future guarded seam side concrete:

- one exact pair apply candidate method: `applySupersedePair`
- one exact old/new pair update bundle
- one exact shared write bundle
- one exact pair guard bundle
- one exact audit-correlation bundle
- one exact rollback carry-forward

That means later work no longer has to re-decide:

- whether seam discussion is still pair-shaped
- whether old/new expected lifecycle and scope guards travel together
- whether audit follow-up stays correlated to the same pair candidate
- whether single-record reuse can silently sneak back in

## Validation

Targeted validation:

- `node --check src\core\MemorySupersedeShadowSeamCandidateHelper.js`
- `node --check tests\memory-supersede-shadow-seam-candidate-helper.test.js`
- `node --test tests\memory-supersede-shadow-seam-candidate-helper.test.js`
- public MCP freeze scan over app/adapters
- readiness/no-overclaim scan over the scoped packet

Docs/board validation:

- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Boundaries

This slice does not:

- implement the guarded two-record supersede seam
- implement a durable audit writer
- implement an internal supersede service
- add a third adopter to the shared internal runtime-entry gate
- expand public MCP
- widen public `callTool()`
- execute true live memory action
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC ready` or production readiness

Project state remains `RC_NOT_READY_BLOCKED`.

## Next

The next smallest safe step should now be:

1. a bounded guarded two-record supersede shadow-store seam implementation candidate
2. only after that, any internal supersede service wiring discussion
3. only after that, any shared-gate adoption discussion
