# P52 Schema / Version Runtime Enforcement Boundary Plan

Status: boundary contract only.

P52 starts the bridge from fixture evidence toward runtime schema/version enforcement, but this slice does not implement runtime enforcement. It defines the exact metadata and fail-closed semantics that a future runtime boundary must preserve before any governed memory action, ValidationAggregator evidence claim, final RC matrix runner input, migration dry-run, or governance review/audit path can be accepted.

## Scope

P52-T1 is limited to:

- synthetic fixture evidence
- committed fixture/test documentation
- schemaVersion / policyVersion / manifestVersion boundary semantics
- exact-set fail-closed cases
- no runtime mutation, no durable write, and no real memory read

P52-T1 does not:

- enforce live runtime requests
- expand public MCP tools or schemas
- read diary, SQLite, vector index, candidate cache, recall audit, or real memory content
- execute migration/import/export/backup/restore
- call providers or models
- start services or install watchdog/startup hooks
- switch Codex/Claude config
- write durable memory or audit records
- claim v1.0 RC readiness

## Required Metadata

Any future runtime enforcement boundary must treat these fields as required and exact:

- `schemaVersion`
- `policyVersion`
- `manifestVersion`

Missing, unknown, unsupported, duplicate, malformed, ambiguous, unparsable, stale, or mismatched values fail closed. Warning-only or skipped critical gates also fail closed.

## Boundary Stages

The contract separates four states that must not be collapsed:

- fixture evidence: committed or synthetic local evidence only
- explicit-input helper: caller-provided object normalization only
- runtime enforcement: future live boundary checks, not implemented by this slice
- RC evidence report: future aggregated evidence report, not readiness by itself

## Current Decision

P52-T1 is accepted for boundary planning only. Runtime enforcement, final RC runner execution, governed action approval, durable audit/memory writes, migration/import-export apply, backup/restore, public MCP expansion, provider calls, config/watchdog actions, push, tag, release, and deploy remain blocked.

v1.0 RC remains `NOT_READY_BLOCKED`.
