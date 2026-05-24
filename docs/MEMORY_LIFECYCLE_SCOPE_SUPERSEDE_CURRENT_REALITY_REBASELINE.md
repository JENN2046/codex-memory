# Memory Lifecycle Scope Supersede Current Reality Rebaseline

Status: `MEMORY_LIFECYCLE_SCOPE_SUPERSEDE_CURRENT_REALITY_REBASELINE_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0964`

## Purpose

This slice prevents old supersede governance candidates from reintroducing stale blockers after newer local commits changed repository reality.

Current HEAD already contains local commits for:

- `5923880 feat: add supersede shadow seam`
- `5872f80 feat: add supersede mutation service`
- `bae33d2 test: add supersede temp-local evidence`

Some older untracked supersede planning artifacts still say the two-record shadow seam or internal supersede service is not implemented. Those statements are stale against current HEAD and should not be committed as-is.

## Added Surface

Added:

- [MemorySupersedeCurrentRealityRebaseline.js](/A:/codex-memory/src/core/MemorySupersedeCurrentRealityRebaseline.js)
- [memory-supersede-current-reality-rebaseline.test.js](/A:/codex-memory/tests/memory-supersede-current-reality-rebaseline.test.js)

The helper is explicit-input only. It does not read files, execute commands, start services, call providers, read real memory, write durable state, stage, commit, push, or claim readiness.

## Rebaseline Result

The helper separates:

- implemented supersede surfaces already proven by local commits;
- stale prior blockers that should not be copied forward;
- remaining unproven surfaces that still block runtime or readiness claims.

Implemented surfaces:

- two-record shadow seam;
- internal supersede mutation service;
- supersede temp-local evidence.

Stale blockers detected when present:

- `two_record_shadow_seam_not_implemented`
- `internal_supersede_service_not_implemented`

Remaining blockers:

- app service wiring is not committed/proven in HEAD;
- internal CLI entry is not committed/proven in HEAD;
- internal runtime entry is not committed/proven in HEAD;
- shared gate adoption is not committed/proven in HEAD;
- live governance proof is not executed/proven.

## Validation

Validated:

- `node --check src\core\MemorySupersedeCurrentRealityRebaseline.js`
- `node --check tests\memory-supersede-current-reality-rebaseline.test.js`
- `node --test tests\memory-supersede-current-reality-rebaseline.test.js`

Targeted coverage proves:

- current supersede reality is accepted without claiming readiness;
- implemented surface list is locked;
- missing implemented surfaces fail closed;
- public MCP drift fails closed;
- sensitive explicit input is redacted.

## Boundaries

This slice does not:

- implement app wiring;
- implement an internal CLI entry;
- implement an internal runtime entry;
- add a third shared-gate adopter;
- execute live governance proof;
- expand public MCP;
- execute true live memory actions;
- call providers or external APIs;
- change secrets, config, watchdog, or startup;
- push;
- claim `memory write reliable`;
- claim `memory recall reliable`;
- claim `RC_READY` or production readiness.

## Next Safe Step

Future supersede candidates should first be rebased against this current reality:

- keep the implemented seam/service/temp-local evidence;
- remove stale blocker wording;
- preserve public MCP freeze;
- keep app/runtime/live proof still blocked until separately validated.
