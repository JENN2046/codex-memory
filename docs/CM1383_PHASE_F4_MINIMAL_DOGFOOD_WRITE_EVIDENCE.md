# CM-1383 Phase F4 Minimal Dogfood Write Evidence

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_F4_ACCEPTED_NOT_READY`

Decision: `NOT_READY_BLOCKED`

Operator state: `RC_NOT_READY_BLOCKED`

## Scope

Exact-approved Phase F4 minimal personal dogfood write proof was executed once for:

- Branch: `main`
- Commit: `13a3a313e99611b31ba671fadb63e0f61797b5aa`
- App factory: `createCodexMemoryApplication`
- App tool path: `record_memory`
- Request source: `phase-f4-minimal-personal-dogfood-write-proof`
- Provider gate override for this process only: `allowExternalProvider=false`

Approved boundary:

- Exactly one sanitized `record_memory` call.
- Use the current local codex-memory real store.
- Use current-session bearer token only if already present.
- Do not print or persist token material.
- Allow only the durable memory/audit write required for that single sanitized dogfood record.
- No provider call.
- No `search_memory` call.
- No raw memory output.
- No direct `.jsonl` read.
- No broad real memory scan.
- No migration/import/export/backup/restore apply.
- No config/watchdog/startup change.
- No public MCP expansion.
- No package or lockfile change.
- No tag/release/deploy/cutover.
- No readiness or reliability claim.

## Fresh Preconditions

- `HEAD == origin/main == 13a3a313e99611b31ba671fadb63e0f61797b5aa`
- `main...origin/main == 0 / 0`
- Worktree was clean before execution.
- Phase F snapshot reported `f4MinimalDogfoodWriteTemplateCurrentlyUsable=true`.
- F1 evidence accepted: `true`
- F2 evidence accepted: `true`
- F3 evidence accepted: `true`
- F4 evidence accepted before execution: `false`

## Result

The bounded write returned selected sanitized fields only:

```text
PHASE_F4_SINGLE_RECORD_MEMORY_CALL_COMPLETED_SANITIZED_RESULT
```

Selected result:

- Decision: `accepted`
- Success: `true`
- Memory id: `codex-process-29237bc07e394bc08953a7533129293b`
- Target: `process`
- Request source: `phase-f4-minimal-personal-dogfood-write-proof`
- Shadow write status: `ok`
- Shadow write failure count: `0`
- Idempotency status: `committed`
- Idempotency replayed: `false`
- Authoritative store: `sqlite`
- Lifecycle committed: `true`
- Lifecycle projected: `true`
- Lifecycle audited: `true`
- File path returned: `true`
- F4 evidence accepted: `true`

## Safety Counters

- `record_memory` calls: `1`
- `search_memory` calls: `0`
- Provider calls: `0`
- MCP tools/call: `0`
- Raw memory output printed: `false`
- Direct `.jsonl` reads: `0`
- Broad real memory scans: `0`
- Config/watchdog/startup changes: `0`
- Public MCP expansion: `false`
- Package/lockfile changes: `0`
- Remote actions: `0`
- Tag/release/deploy/cutover actions: `0`
- Readiness claims: `0`
- Reliability claims: `0`

## Boundary

CM-1383 completes the Phase F4 evidence prerequisite only.

It proves one exact-approved sanitized dogfood write was accepted by the local real store with selected manifest lifecycle evidence. It does not prove broad write reliability, recall reliability, RC readiness, release readiness, cutover readiness, or production readiness.

The next Phase F step is F5 closeout to determine whether the evidence chain reaches `PERSONAL_DOGFOOD_READY_NOT_RC_READY`. Do not execute additional `record_memory`, `search_memory`, provider calls, raw memory reads, direct `.jsonl` reads, broad real memory scans, durable writes, config/watchdog/startup changes, remote actions, or readiness/reliability claims without a separate exact scope.
