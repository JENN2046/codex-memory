# V8 TagMemo Persistent Enrichment Sprint E Preflight

## Scope

Sprint E prepares governance for persistent TagMemo enrichment.

This is a docs/preflight slice only.

```text
persistent tag enrichment: NOT_STARTED
persistent tag write: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Goal

Define the governance boundary, data model options, write strategy, rollback path, migration sketch, and fixture/test plan for a future persistent tag enrichment implementation.

The future implementation must only promote audited bounded projections into durable tag state after a separate exact approval or dedicated implementation task. Sprint E preflight does not authorize that promotion.

## Proposed Storage Model

Preferred route:

```text
sidecar tag index
```

Rationale:

- Keeps original memory records immutable unless a future migration explicitly approves derived-field backfill.
- Allows tag writes to be independently audited, rebuilt, tombstoned, or rolled back.
- Avoids changing the public `record_memory` / `search_memory` response contract.
- Preserves room for tag provenance, evidence source, score version, and lifecycle state.

Candidate sidecar shape:

```text
tagEnrichmentId
memoryId
tagId
tagLabel
tagSource
confidenceScore
evidenceSourceId
projectionVersion
createdByTaskId
createdAtBucket
lifecycleStatus
```

Not selected for first persistent preflight:

```text
memory record derived fields
```

That route would couple enrichment lifecycle to memory record mutation and requires stricter migration, rollback, and idempotency proof.

## Write Strategy

Future write path must be exact-approval gated.

Minimum future gate:

- Fresh synced Git state.
- Clean worktree.
- Current source/test validation.
- Exact target store or temp-store declaration.
- Dry-run output showing proposed tag rows without persistence.
- Explicit approval for one bounded persistent tag enrichment operation.
- Rollback plan and cleanup command.
- Post-write proof that public MCP surface remains seven tools.

Default write policy:

```text
fail-closed before persistence
```

No tag row may be written when:

- bounded projection validation fails
- forbidden raw/private fields are detected
- provider/API/token-shaped fields are detected
- source memory lifecycle state is deleted, tombstoned, private-ineligible, or unknown
- migration version is unsupported
- rollback path is unavailable
- public response expansion is requested

## No-Op Projection Upgrade Path

Sprint D produced internal no-op recall projection.

Future persistent enrichment may consume only audited bounded projection output:

```text
deterministic tag extraction core
runtime no-op tag projection
runtime no-op recall projection
bounded metadata projection
safe evidence hints
```

The upgrade path must not read raw memory records, broad scan memory stores, call providers, or infer tag content from private/raw fields.

## Raw / Private Field Boundary

Persistent tag store must not contain:

```text
raw memory text
raw audit payload
raw JSONL row
raw SQLite row
file path
workspace path
provider endpoint
API key
bearer token
client secret
unbounded lifecycle metadata
public MCP response payload
```

Allowed tag evidence must be bounded:

```text
memoryId
tagId
tagLabel
tagSource
confidenceScore
evidenceSourceId
projectionVersion
safe lifecycle bucket
safe evidence hint
```

## Rollback / Cleanup Plan

Future persistent enrichment must include a rollback plan before write approval:

- Identify rows by `projectionVersion` and `createdByTaskId`.
- Support dry-run cleanup listing without raw/private fields.
- Require exact approval for destructive cleanup.
- Keep deletion/tombstone sync as fail-closed until lifecycle sync tests exist.
- Preserve original memory records unchanged.
- Verify public MCP surface and public response contract after cleanup.

## Migration Plan Sketch

Migration is not authorized by this preflight.

Future migration gate should include:

- temp-store fixture migration first
- dry-run over bounded projection fixtures
- schema version compatibility check
- rollback readiness
- deletion/tombstone sync policy
- no real DB apply unless separately approved

## Deletion / Tombstone Sync Strategy

Initial policy:

```text
fail-closed / no-op when lifecycle state is not safely bounded
```

Future enrichment rows should be suppressible by `memoryId` and lifecycle bucket without exposing raw lifecycle payload. Tombstone/deletion sync should be a separate testable source slice before any persistent write approval.

## Fixture / Test Plan

Planned future tests:

- sidecar row schema accepts only bounded TagMemo fields
- dry-run proposes deterministic tag rows without persistence
- forbidden raw/private fields are rejected
- provider/API/token-shaped fields are rejected
- duplicate tag rows merge deterministically
- confidence score remains bounded
- lifecycle/tombstone unsafe state fails closed
- rollback selector uses `projectionVersion` and `createdByTaskId`
- public MCP surface remains seven tools
- public `search_memory` / `record_memory` response contracts remain unchanged

## Explicit Non-Goals

```text
implement persistent tag enrichment: NO
execute persistent tag write: NO
execute second effective record_memory write: NO
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
live proof: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Validation

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
changed-scope review
staged diff check
```
