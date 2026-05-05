# ROADMAP.md — codex-memory

## 1. Roadmap Purpose

This roadmap turns the `codex-memory` final goal into phased, executable milestones.

Current repository reality:

- `codex-memory` is already an implemented CommonJS JavaScript repository, not a blank Phase 0 skeleton.
- The current source layout is `src/core`, `src/storage`, `src/recall`, `src/adapters`, and `src/cli`.
- `record_memory`, `search_memory`, and `memory_overview` are the current public MCP tools.
- The default mainline has already moved to the local HTTP MCP route and the project is in maintenance/refinement mode.
- This roadmap is a long-term evolution map. Current source, README, STATUS, and validation output outrank older greenfield wording in this file.

The final goal is large:

`codex-memory` must become the independent, Codex-oriented implementation of the full VCP memory system.

The roadmap exists to prevent the project from trying to build the entire memory universe in one pass.

Each phase must be:

- scoped
- testable
- reversible
- inspectable
- safe for Codex execution
- honest about what is not implemented yet

Do not skip governance.

Do not skip validation.

Do not let advanced memory intelligence arrive before the local memory core is trustworthy.

---

## 2. North Star

`codex-memory` exists to give Codex, VCP, codex-router, Photo Studio OS, and multi-agent workflows a trustworthy long-term memory kernel.

It must eventually support:

- VCP-compatible memory objects
- durable long-term memory
- tag-based memory modeling
- semantic association
- hybrid retrieval
- memory compaction
- auditability
- secret protection
- supersession
- deletion / tombstone
- MCP tools
- multi-agent coordination
- ecosystem integration

The route must remain staged.

Final destination: full VCP memory parity and evolution.

Current step: preserve the safe local memory core while adding small, validated governance and parity improvements.

---

## 3. Roadmap Summary

```text
Phase 0  Governance Foundation
Phase 1  Local Memory Core
Phase 2  VCP-Compatible Data Model
Phase 3  Controlled Hybrid Retrieval
Phase 4  TagMemo / Semantic Association
Phase 5  Advanced VCP Memory Intelligence
Phase 6  MCP and Multi-Agent Workflow
Phase 7  Ecosystem Integration
Phase 8  Observability, Admin, and Long-Term Maintenance
```

Suggested execution strategy:

```text
build trust -> build memory -> build retrieval -> build association -> build intelligence -> build ecosystem
```

---

## 4. Global Rules for Every Phase

Every phase must define:

- goal
- scope
- deliverables
- validation
- non-goals
- risks
- exit criteria
- next safe step

Every phase must report:

```text
Status:
Changed:
Validated:
Not validated:
Risk:
Next:
```

For memory-specific work, also report:

```text
Memory operation:
Records read:
Records written:
Records updated/superseded:
Records deleted/tombstoned:
Sensitive data handling:
Evidence/provenance:
```

Do not mark a phase complete merely because files were created.

A phase is complete only when its validation status is clear.

---

## 5. Phase 0 — Governance Foundation

### Goal

Define what `codex-memory` is, what it is not, how it should evolve, and what safety rules agents must obey.

### Deliverables

Required:

- `agent.md`
- `AGENTS.md`
- `PROJECT_GOAL.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `MEMORY_POLICY.md`
- `VALIDATION.md`
- `README.md`

Optional:

- `CONTRIBUTING.md`
- `MCP_CONTRACT.md`
- `VCP_COMPATIBILITY.md`

### Allowed Work

- create documentation
- refine goals
- define non-goals
- define architecture
- define phase milestones
- define validation policy
- define memory policy
- define first implementation scope

### Not Allowed

- full memory implementation
- full VCP migration
- advanced TagMemo implementation
- vector database integration
- remote writes
- cloud sync
- production deployment

### Validation

- docs are internally consistent
- final goal is clear
- non-goals are explicit
- first milestone is bounded
- Codex can safely derive Phase 1 tasks from the docs

### Exit Criteria

Phase 0 is complete when:

- project rules exist
- final goal exists
- architecture direction exists
- roadmap exists
- memory policy exists
- validation policy exists
- README explains the project
- Phase 1 implementation scope is narrow and safe

### Current Status

Complete for the current repository.

Current repository baseline:

- `AGENTS.md`
- `PROJECT_GOAL.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `MEMORY_POLICY.md`
- `VALIDATION.md`
- `README.md`

Historical note: `agent.md` appears in the original greenfield checklist, but the current project uses `AGENTS.md` as the active agent instruction file.

---

## 6. Phase 1 — Local Memory Core

### Goal

Build the smallest trustworthy local memory kernel.

The system should be able to safely record, retrieve, inspect, and audit local memory.

### Deliverables

Required:

- TypeScript project setup
- `MemoryRecord` schema
- memory status types
- sensitivity level types
- local JSONL or SQLite storage adapter
- `record_memory` service
- `search_memory` service
- `memory_overview` service
- secret detector
- redactor
- audit event model
- audit log
- unit tests
- basic README usage examples

Recommended first storage:

- JSONL for simplicity
- SQLite only if the project is already ready for it

### Suggested Minimal Repository Slice

```text
src/
  memory/
    memory-record.ts
    memory-writer.ts
    memory-reader.ts
    memory-overview.ts
  storage/
    storage-adapter.ts
    jsonl-store.ts
  policy/
    write-policy.ts
    sensitivity-policy.ts
  sanitize/
    secret-detector.ts
    redactor.ts
  audit/
    audit-event.ts
    audit-log.ts
tests/
  memory-write.test.ts
  memory-search.test.ts
  sensitivity-policy.test.ts
  audit-log.test.ts
```

### Allowed Work

- create local project skeleton
- create schemas
- implement local write/read
- implement simple keyword search
- implement redaction
- implement audit events
- add tests
- run local validation

### Not Allowed

- vector database dependency
- advanced semantic retrieval
- full TagMemo
- full VCP migration
- remote memory store
- cloud sync
- production write path
- uncontrolled import of real memory

### Validation

Minimum tests:

- valid memory can be recorded
- secret-like content is rejected or redacted
- memory can be retrieved by keyword
- memory overview returns counts
- audit event is created for durable write
- stale or invalid input is handled safely

### Exit Criteria

Phase 1 is complete when:

- local memory can be safely written
- local memory can be searched
- memory overview works
- secrets are not stored raw
- audit events are created
- tests pass
- validation status is reported honestly

### Result Label Target

`COMPLETED_VALIDATED`

If tests are unavailable:

`COMPLETED_UNVALIDATED` with a clear explanation.

---

## 7. Phase 2 — VCP-Compatible Data Model

### Goal

Represent the core memory object families needed for VCP memory parity.

### Deliverables

Required:

- `MemoChunk`
- `Tag`
- `KnowledgeChunk`
- `AgentProfile`
- `ProjectContext`
- `TaskContext`
- `Checkpoint`
- `Handoff`
- `Tombstone`
- conversion between `MemoryRecord` and VCP-compatible records
- import/export draft format
- tests for model conversion

### Allowed Work

- define VCP-compatible TypeScript types
- create fixture data
- create safe import/export dry-run
- mark stale/superseded/tombstoned records
- add tests for conversions and state transitions

### Not Allowed

- importing real full VCP memory without approval
- destructive migration
- silent schema rewrite
- hard deletion of memory records
- advanced semantic engine implementation

### Validation

Minimum tests:

- can construct valid `MemoChunk`
- can construct valid `Tag`
- can construct valid `KnowledgeChunk`
- can convert selected VCP-compatible objects into `MemoryRecord`
- can mark record as stale
- can supersede old memory
- can tombstone memory without raw secret exposure

### Exit Criteria

Phase 2 is complete when:

- main VCP memory object families are represented
- memory lifecycle states are supported
- sample import/export is safe
- tests pass

---

## 8. Phase 3 — Controlled Hybrid Retrieval

### Goal

Move from simple search to controlled recall.

Retrieval should become scoped, ranked, deduplicated, and status-aware.

### Deliverables

Required:

- keyword retrieval
- metadata filtering
- scope filtering
- tag filtering
- time filtering
- status filtering
- deduplication
- reranking interface
- retrieval result explanation

Optional:

- vector adapter interface
- embedding cache interface
- hybrid retrieval draft

### Allowed Work

- improve search
- add filters
- add ranking scores
- add explanation metadata
- add deduplication
- add test fixtures

### Not Allowed

- treating vector similarity as truth
- making stale memory invisible without trace
- exposing sensitive content through search results
- binding project to one vector database too early
- uncontrolled broad search across all scopes

### Validation

Minimum tests:

- scoped query returns only correct scope unless global search is explicit
- stale memory is marked in results
- superseded memory is distinguishable
- duplicate memories do not dominate results
- sensitive content is redacted
- query explanation exists

### Exit Criteria

Phase 3 is complete when:

- retrieval is scoped
- retrieval is explainable
- retrieval handles stale/superseded states
- retrieval can deduplicate
- tests pass

---

## 9. Phase 4 — TagMemo / Semantic Association

### Goal

Implement VCP-inspired tag intelligence.

Memory should begin to associate across tags, concepts, projects, and time.

### Deliverables

Required:

- tag graph
- directed tag sequence
- tag weights
- tag resonance score
- semantic gravity interface
- related memory expansion
- association trace
- bounded expansion rules

Optional:

- initial visualization data export
- tag normalization
- tag clustering

### Allowed Work

- build tag graph
- attach tags to memory
- compute related tags
- expand retrieval through tag associations
- explain why memory was associated

### Not Allowed

- unlimited association expansion
- silent durable memory writes from association
- background dream writes
- black-box rewriting of memory
- replacing search with TagMemo entirely

### Validation

Minimum tests:

- tag graph can link records
- related tags can be retrieved
- tag expansion returns bounded results
- association trace explains why result appeared
- irrelevant expansion is controlled

### Exit Criteria

Phase 4 is complete when:

- TagMemo-like association exists
- association is bounded
- association is explainable
- retrieval can use tag resonance safely
- tests pass

---

## 10. Phase 5 — Advanced VCP Memory Intelligence

### Goal

Implement deeper VCP-style memory cognition.

This is the stage for projection analysis, residual decomposition, compaction, novelty, coherence, and background association.

### Deliverables

Possible modules:

- EPA-style embedding projection analysis
- Residual Pyramid style semantic decomposition
- SVD/PCA assisted semantic basis modeling
- memory compaction engine
- novelty detection
- coherence scoring
- background association engine
- memory proposal generator

### Allowed Work

- analyze embedding or semantic dimensions
- compact repeated memory
- preserve residual novelty
- generate memory proposals
- score coherence
- run background association in dry-run/proposal mode

### Not Allowed

- silent rewriting of memory truth
- automatic durable writes from background association
- irreversible compaction without audit
- deleting unique memory signal
- claiming cognitive capability without validation

### Validation

Minimum tests or checks:

- repeated content can be detected
- compaction preserves source links
- residual/new information is not lost silently
- background association creates proposals, not direct durable writes
- audit events exist for compaction if applied

### Exit Criteria

Phase 5 is complete when:

- advanced engines are modular
- memory compaction is inspectable
- novelty/residual behavior is tested
- background association does not mutate durable memory silently

---

## 11. Phase 6 — MCP and Multi-Agent Workflow

### Goal

Expose governed memory tools to Codex, workers, and external agents.

### Deliverables

Current public MCP tools:

- `record_memory`
- `search_memory`
- `memory_overview`

Phase 6 governance tools:

- `audit_memory`

Next MCP tools:

- `update_memory`
- `supersede_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `validate_memory`

Later MCP tools:

- `import_memory`
- `export_memory`
- `compact_memory`
- `propose_memory`

Multi-agent deliverables:

- worker memory proposal flow
- commander review flow
- proposal deduplication
- conflict resolution
- durable write approval path
- final audit event

### Allowed Work

- create MCP server
- expose safe tool contracts
- add tool tests
- create proposal workflow
- add checkpoint and handoff support

### Not Allowed

- external writes without approval
- workers writing directly to durable memory without policy
- remote storage mutation
- hidden background recording
- broad memory import/export through MCP without safeguards

### Validation

Minimum tests:

- MCP tool contracts validate input
- record tool runs policy and redaction
- search tool respects scope
- overview tool does not expose secrets
- checkpoint/handoff memory can be created safely
- worker proposal does not equal durable write

### Exit Criteria

Phase 6 is complete when:

- Codex can use memory through MCP safely
- worker memory proposals are supported
- durable writes are governed and audited
- tests pass

---

## 12. Phase 7 — Ecosystem Integration

### Goal

Connect `codex-memory` to the user's wider agent ecosystem.

### Integration Targets

- VCPToolBox
- codex-router
- Photo Studio OS
- Codex_Autonomous_Work_Harness
- Agent visual studio workflows
- future desktop or mobile agent entrances

### Deliverables

- VCPToolBox integration plan
- codex-router integration plan
- Photo Studio OS integration plan
- migration tools
- scope and permission model
- shared vs project-local memory rules
- cross-project retrieval rules
- integration tests or dry-runs

### Allowed Work

- create adapters
- create import/export dry-run tools
- define scope boundaries
- test with fixtures
- produce integration plans

### Not Allowed

- uncontrolled cross-project memory sharing
- real migration without backup and approval
- remote service writes without approval
- exposing private user memory to unrelated project scopes
- replacing VCP runtime behavior without explicit design

### Validation

Minimum checks:

- project scopes remain separated
- shared memory is explicit
- sensitive memory does not flow across scopes
- imports can run in dry-run mode
- migration has rollback path
- integration docs match actual code

### Exit Criteria

Phase 7 is complete when:

- ecosystem integration is safe
- scopes are enforceable
- migration path exists
- integration behavior is validated

---

## 13. Phase 8 — Observability, Admin, and Long-Term Maintenance

### Goal

Make the memory system inspectable, maintainable, and governable over time.

### Deliverables

Possible:

- memory overview dashboard
- audit explorer
- stale memory review
- duplicate review
- tombstone review
- sensitive-data block report
- import/export report
- compaction report
- tag graph explorer
- memory health score
- backup and restore flow

### Allowed Work

- build local admin tools
- build CLI inspection tools
- produce reports
- add maintenance commands
- add health checks

### Not Allowed

- exposing memory through public interfaces by default
- cloud admin UI without approval
- showing secrets
- hard deletion from UI without confirmation

### Validation

Minimum checks:

- overview counts are accurate
- audit trail is inspectable
- sensitive values are redacted
- stale/superseded/tombstoned records are visible
- maintenance commands have dry-run modes where appropriate

### Exit Criteria

Phase 8 is complete when:

- the user can understand what memory exists
- the user can see what changed
- the user can review stale or duplicate memory
- maintenance operations are safe

---

## 14. First Implementation Slice

Historical greenfield slice:

```text
Create the Phase 1 local memory core.
```

This slice is retained as background for a blank implementation. It is not the next task for the current repository, because the current repository already has the local memory core, SQLite shadow store, vector index, MCP entrypoints, active-memory compatibility, compare/rollback harnesses, and Phase E gate workflows.

Historical recommended Codex task:

```text
Implement Phase 1 only.

Create the minimal local memory core for codex-memory:
- TypeScript project setup
- MemoryRecord schema
- JSONL storage adapter
- record_memory service
- search_memory service
- memory_overview service
- secret detector / redactor
- audit log
- targeted tests

Do not implement TagMemo, vector search, EPA, Residual Pyramid, VCP migration, cloud sync, remote writes, or advanced multi-agent workflows yet.

Before editing, inspect workspace and Git state.
After editing, run available validation and report changed files, validation status, and remaining risks.
```

---

## 15. Risk Gates

### Low Risk

Allowed by default:

- docs
- local schema
- local tests
- local fixtures
- read-only inspection
- small focused edits

### Medium Risk

Allowed with validation:

- local storage implementation
- local retrieval changes
- redaction logic
- audit log implementation
- MCP tool contract drafts

### High Risk

Plan first, stage carefully:

- vector integration
- schema migration
- import/export tools
- multi-agent write workflows
- compaction engine
- VCP compatibility migration

### Critical Risk

Stop and request explicit approval:

- real memory migration
- irreversible deletion
- remote writes
- cloud sync
- production deployment
- dependency changes without approval
- editing secrets
- broad architecture rewrite
- pushing/merging/releasing

---

## 16. Dependency Timing

Do not add heavy dependencies casually.

Historical greenfield dependency order:

1. TypeScript/test tooling already chosen by project.
2. Minimal local file/JSONL utilities.
3. SQLite only if needed.
4. Schema validation library only if justified.
5. Vector/embedding dependencies only after Phase 3.
6. Graph/ML/numeric dependencies only after Phase 4 or 5.

Dependency changes require approval if they modify manifests or lockfiles.

Current repository note: the project already uses Node.js CommonJS, SQLite-backed local stores, vector/profile artifacts, and Node's built-in test runner. New dependency or package-manager changes still require explicit approval.

---

## 17. Storage Evolution

Historical greenfield storage evolution:

```text
Phase 1: JSONL or SQLite
Phase 2: SQLite with structured tables if needed
Phase 3: indexes and filters
Phase 4: tag graph storage
Phase 5: embedding cache / vector index
Phase 7: import/export adapters
```

Do not start with a complex external vector database unless the project has a validated need.

Current repository note: diary-compatible files, SQLite shadow storage, vector index artifacts, candidate cache, chat history index, and audit logs already exist. Future storage work should preserve those contracts instead of restarting at JSONL.

---

## 18. Completion Definition

`codex-memory` is not complete when it can store and search memory.

It is complete only when it can safely reproduce and evolve the practical capabilities of the VCP memory system in a Codex-compatible form.

Completion requires:

- VCP-compatible memory models
- local durable storage
- safe writes
- reliable retrieval
- hybrid search
- tag association
- memory compaction
- stale/supersession handling
- tombstone/forget flow
- audit logging
- secret protection
- MCP access
- multi-agent proposal/review
- ecosystem integration
- validation suite
- honest documentation

Until then, each phase is a controlled step toward memory parity.

---

## 19. Current Recommended Next Step

Use the current Phase E maintenance baseline as the starting point:

1. Start from `PHASE_E_SUMMARY.md`, `PHASE_E_BACKLOG.md`, and `PROJECT_CLOSURE.md`.
2. Keep `record_memory`, `search_memory`, `memory_overview`, HTTP MCP, compare/rollback, and gate behavior stable.
3. Pick the smallest local, reversible, validated improvement from the maintenance backlog.
4. Treat future tools such as `update_memory`, `supersede_memory`, `forget_memory`, checkpoint/handoff memory, import/export, and multi-agent arbitration as planned evolution, not current public contracts.

Do not reopen the project as a blank Phase 1 implementation.

Keep the memory safe.

Then make it deeper.

Then make it alive.
