# Memory Lifecycle Scope Durable Governance Mutation Flow

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_MUTATION_FLOW_DESIGN_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0860`

## Purpose

CM-0852 through CM-0859 progressively made governance state capable of influencing recall addressing and candidate-cache invalidation:

- default derived governance revision;
- governance-only invalidation;
- target-local invalidation;
- dependency-aware invalidation;
- default per-record invalidation;
- provider snapshot invalidation;
- provider sparse change-set invalidation.

What still remains open is the durable source of governance mutations themselves.

CM-0860 fixes that design gap by choosing the smallest durable governance mutation model that fits current repository reality and the long-term goal of a local-first, auditable, rollback-ready memory mainline.

This is a design packet only. It does not execute durable governance mutation, alter SQLite schema, append new durable governance events, run provider calls, expand public MCP, or claim readiness/reliability.

## Current-State Supersession Note

This design packet is retained as the durable-governance direction-setting artifact.

Some implementation order details are now historical because later internal tombstone and supersede work advanced beyond this packet:

- internal tombstone and supersede services now exist;
- internal app and CLI surfaces now exist for tombstone and supersede;
- recall/cache invalidation now has target-local, dependency-aware, per-record, and provider change-set evidence.

The still-current architectural direction is the chosen model: append-only governance mutation audit, SQLite shadow current-state projection, and revision/change-set signals feeding recall invalidation. This packet still does not prove public MCP readiness, live durable governance, live recall/write reliability, RC readiness, or production readiness.

## Current Reality

Useful current pieces already exist:

- `ValidateMemoryService` already performs one bounded internal lifecycle mutation: `proposal/stale -> active`.
- `AuditLogStore` already provides append-only audit persistence.
- `SqliteShadowStore` already stores scope tuple metadata and contains optional lifecycle-aware helpers such as `getRecordValidationPolicy()` and `updateLifecycleStatus()`.
- `KnowledgeBaseSyncService` can already consume governance revisions, snapshots, and sparse `changedMemoryIds`.
- candidate-cache invalidation is already able to react to:
  - ordinary sync changes;
  - default governance entry drift;
  - provider snapshot drift;
  - provider sparse change-set drift.

What is still missing is a single chosen internal flow that answers:

1. where durable governance mutations are recorded;
2. what counts as the current projected governance state;
3. how mutation paths produce revision and change-set signals for recall invalidation.

## Approach Comparison

| approach | strengths | weaknesses | decision |
|---|---|---|---|
| inline-only shadow row mutation | simple reads; no second projection surface | weak audit story; hard to explain/repair/rollback; lifecycle semantics become row-state only | rejected |
| append-only journal only | strongest audit story; easy history | current recall path needs projected current state; journal-only reads are too expensive and awkward for normal recall | rejected |
| append-only mutation audit plus shadow projection plus revision/change-set emitter | auditable, local-first, recall-friendly, compatible with current sync/cache hooks, and incremental from existing code | requires a clear projection contract and staged schema work | chosen |

## Chosen Model

The chosen durable governance mutation flow is:

1. internal governance mutation packet enters a governance mutation service;
2. service validates packet, scope, lifecycle transition, and reason/evidence boundaries;
3. service produces a dry-run projection diff first;
4. confirmed mutation writes append-only mutation audit intent through the existing audit surface;
5. service applies bounded SQLite shadow projection updates for current governance state;
6. service writes committed or cancelled mutation audit evidence;
7. service emits a normalized governance revision and `changedMemoryIds` set;
8. recall invalidation consumes those signals through the CM-0852..CM-0859 path.

This model keeps:

- audit trail append-only;
- current-state reads cheap and local;
- recall invalidation precise;
- public MCP unchanged.

## Durable State Roles

### 1. Canonical Event Trail

Use append-only governance mutation audit events as the canonical durable event trail.

Do not create a separate public governance runtime or public mutation tool in this phase.

The canonical event trail should stay compatible with the existing audit infrastructure:

- intent
- committed
- cancelled
- explicit actor
- exact target memory ids
- exact scope tuple
- exact lifecycle transition
- exact reason/evidence

This reuses the existing two-phase audit mindset already present in `ValidateMemoryService`.

### 2. Current-State Projection

Use SQLite shadow metadata as the current projected governance state for recall/runtime reads.

This is the correct place for:

- lifecycle status
- lifecycle actor / timestamp
- status reason
- superseded-by / supersedes relationship
- tombstone reason
- logical exclusion markers

The diary remains the primary memory source, but normal recall should not have to replay governance event history on every query.

### 3. Revision And Change-Set Emitter

Every confirmed governance mutation must produce:

- a stable post-mutation revision token; and
- a normalized `changedMemoryIds` set.

That output is the bridge from durable mutation to the already-built recall invalidation chain.

## Minimal Mutation Families

The first durable governance mutation families should be phased in this order:

1. `memory_validate`
   - already exists internally
   - keep as the reference mutation protocol
2. `memory_supersede`
   - active -> superseded on old record
   - new active replacement linked by exact ids
3. `memory_tombstone`
   - active/stale/superseded -> tombstoned
   - non-destructive by default
4. `memory_exclude` / `memory_forget`
   - logical exclusion first
   - physical deletion remains separately hard-gated

This ordering keeps the system aligned with:

- append-only audit;
- rollback-ready reasoning;
- non-destructive remediation;
- no readiness overclaim.

## Minimal Projection Fields

The next durable projection should standardize at least these shadow fields:

- `status`
- `status_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`
- `superseded_by`
- `supersedes`
- `tombstone_reason`

Existing scope tuple fields already present in the shadow store should remain reused:

- `project_id`
- `workspace_id`
- `client_id`
- `task_id`
- `conversation_id`
- `visibility`
- `retention_policy`

This is intentionally narrower than a full object-model migration.

## Why This Model Fits Current Code

This design is chosen because it matches current repository reality instead of restarting architecture:

- `ValidateMemoryService` already proves an internal lifecycle mutation protocol.
- `AuditLogStore` already gives a durable append-only surface.
- `SqliteShadowStore` already exposes enough lifecycle/scoped read/update seams to extend.
- `KnowledgeBaseSyncService` already knows how to consume revision, snapshot, and sparse change-set outputs.

So the missing piece is not a new architecture. It is a staged internal governance mutation service and projection contract.

## Explicit Non-Decisions

CM-0860 does not decide:

- public MCP governance tools;
- real hard delete flow;
- migration/import/export apply;
- broad schema rewrite;
- a separate governance daemon/service;
- provider/API involvement in governance mutation;
- readiness, RC readiness, or production readiness.

## Next Implementation Ladder

Recommended next sequence:

1. `CM-0861`
   - fixture-only governance mutation packet contract
   - lock allowed actions, required fields, exact scope binding, and fail-closed blockers
2. `CM-0862`
   - pure internal governance mutation dry-run helper
   - no durable write, no public MCP
3. `CM-0863`
   - temp-local or fixture-backed shadow projection proof for supersede/tombstone flows
4. `CM-0864`
   - internal-only runtime candidate review for durable governance mutation wiring

This is the smallest path that makes the requested long-term end state more true without pretending the system is already ready.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_MUTATION_FLOW_DESIGN_COMPLETED_NOT_READY`

The chosen direction is:

- append-only governance mutation audit as canonical event trail;
- SQLite shadow metadata as current-state projection;
- revision/change-set emission as the bridge into the existing recall invalidation chain.

That is the most aligned next step toward a local-first, auditable, rollback-ready, provider-flexible default memory mainline.
