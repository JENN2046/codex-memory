# Memory Lifecycle Scope Supersede Runtime-Prep Rebase Review

Status: `MEMORY_LIFECYCLE_SCOPE_SUPERSEDE_RUNTIME_PREP_REBASE_REVIEW_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0965`

## Purpose

This slice adds a small pre-commit review helper for supersede runtime-prep/app candidates.

The immediate problem is that some older untracked supersede candidates were drafted before current HEAD contained:

- `5923880 feat: add supersede shadow seam`
- `5872f80 feat: add supersede mutation service`
- `bae33d2 test: add supersede temp-local evidence`
- `e613dce test: add supersede reality rebaseline`

Those older candidates can still carry stale blocker wording such as `two_record_shadow_seam_not_implemented` or `internal_supersede_service_not_implemented`. Committing that wording would pollute the runtime path with facts that are no longer true.

## Added Surface

Added:

- [MemorySupersedeRuntimePrepRebaseReview.js](/A:/codex-memory/src/core/MemorySupersedeRuntimePrepRebaseReview.js)
- [memory-supersede-runtime-prep-rebase-review.test.js](/A:/codex-memory/tests/memory-supersede-runtime-prep-rebase-review.test.js)

The helper is explicit-input only. It does not read files, execute commands, start services, call providers, read real memory, write durable state, stage, commit, push, or claim readiness.

## Review Contract

The helper accepts a future supersede runtime-prep candidate only when:

- the CM-0964 current-reality rebaseline is accepted;
- public MCP tools remain exactly `memory_overview`, `record_memory`, and `search_memory`;
- required denied actions are present;
- stale supersede blockers are removed from the candidate;
- remaining app/runtime/live-proof blockers are preserved.

Stale blockers that must not be copied forward:

- `two_record_shadow_seam_not_implemented`
- `internal_supersede_service_not_implemented`
- `supersede_temp_local_evidence_missing`

Remaining blockers that must stay visible:

- app service wiring is not committed/proven in HEAD;
- internal CLI entry is not committed/proven in HEAD;
- internal runtime entry is not committed/proven in HEAD;
- shared gate adoption is not committed/proven in HEAD;
- live governance proof is not executed/proven.

## Validation

Validated:

- `node --check src\core\MemorySupersedeRuntimePrepRebaseReview.js`
- `node --check tests\memory-supersede-runtime-prep-rebase-review.test.js`
- `node --test tests\memory-supersede-runtime-prep-rebase-review.test.js`

Targeted coverage proves:

- a rebased runtime-prep candidate review can be accepted without readiness;
- stale blockers fail closed;
- an unaccepted current-reality rebaseline fails closed;
- public MCP drift fails closed;
- sensitive explicit input is redacted.

## Boundaries

This slice does not:

- implement supersede app wiring;
- implement a supersede internal CLI entry;
- implement a supersede internal runtime entry;
- add a shared-gate adopter;
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

Use this helper as a pre-commit guard before rebasing and validating the larger supersede runtime-prep/app candidate bundle.
