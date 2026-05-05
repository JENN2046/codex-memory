# PROJECT_GOAL.md — codex-memory

## 1. Final Goal

`codex-memory` is the independent, Codex-oriented implementation of the full VCP memory system.

It is designed as a local-first, auditable, reversible, privacy-safe, MCP-accessible long-term memory kernel for Codex, VCP, codex-router, Photo Studio OS, and multi-agent workflows.

The project must eventually reproduce and evolve the practical capability set of the VCP memory system, while adding stronger governance for Codex-style autonomous execution.

`codex-memory` is not a basic note app, chat archive, or simple vector database.

It is a governed memory kernel for agents that need a trustworthy past.

---

## 2. One-Sentence Mission

Give Codex and multi-agent systems a durable, searchable, correctable, auditable, and VCP-compatible long-term memory layer.

---

## 3. Core Philosophy

Memory is not truth.

Memory is structured evidence that must remain:

- scoped
- sourced
- searchable
- correctable
- supersedable
- deletable
- auditable
- privacy-safe
- useful across time

A memory system without correction becomes superstition.

A memory system without audit becomes fog.

A memory system without deletion becomes a prison.

The feature is not memory.

The feature is trustworthy memory.

---

## 4. VCP Memory Parity Target

The final project must aim to support the full practical capability range of the VCP memory system.

Target capabilities include:

1. Durable long-term memory.
2. Short-term context condensation.
3. Conversation memory.
4. Project memory.
5. User preference memory.
6. Agent identity / profile memory.
7. Task memory.
8. Checkpoint memory.
9. Handoff memory.
10. Knowledge memory.
11. VCP-compatible `MemoChunk` modeling.
12. VCP-compatible `Tag` modeling.
13. VCP-compatible `KnowledgeChunk` modeling.
14. Tag-based semantic memory.
15. Directed tag sequences.
16. Tag weight and tag resonance.
17. TagMemo-style semantic association.
18. Semantic gravity / memory attraction.
19. Lexical retrieval.
20. Metadata retrieval.
21. Tag retrieval.
22. Vector retrieval.
23. Hybrid retrieval.
24. Query expansion.
25. Result reranking.
26. Result deduplication.
27. Stale memory detection.
28. Memory supersession.
29. Memory tombstone / forgetting.
30. Memory compaction.
31. Import / export.
32. Migration safety.
33. Secret detection.
34. Secret redaction.
35. Audit logging.
36. Memory validation.
37. EPA-style embedding projection analysis.
38. Residual Pyramid style semantic decomposition.
39. SVD / PCA assisted semantic basis modeling.
40. Novelty detection.
41. Coherence scoring.
42. Background association / dream-like memory processing.
43. Multi-agent memory proposal and arbitration.
44. MCP tools for Codex and external agents.
45. Integration with VCPToolBox.
46. Integration with codex-router.
47. Integration with Photo Studio OS.
48. Integration with future agent desktop/mobile entrances.

The project may implement these capabilities in phases.

The final target is large. Each milestone must remain small, testable, and reversible.

---

## 5. Codex Governance Target

The project must adapt VCP-style memory into a form safe for Codex and autonomous agents.

Codex-facing memory tools must eventually include:

- `record_memory`
- `search_memory`
- `memory_overview`
- `update_memory`
- `supersede_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `audit_memory`
- `validate_memory`
- `import_memory`
- `export_memory`

Every durable write must pass through governance checks:

- scope check
- sensitivity check
- provenance check
- confidence check
- duplicate check
- retention check
- audit event creation
- rollback or correction path

Codex must not silently write long-term memory as a side effect of unrelated work.

Durable memory writes must be intentional, inspectable, and auditable.

---

## 6. Non-Goals

`codex-memory` must not become:

- a generic note-taking app
- a raw chat history dump
- a blind vector database wrapper
- a simple RAG demo
- a secrets warehouse
- a project management system
- a replacement for VCPToolBox runtime tools
- a replacement for codex-router task governance
- a hidden recorder that stores everything automatically
- a system that treats old memory as current truth
- an uncontrolled cross-project data leak
- a cloud-first memory service by default

The system does not remember everything.

It decides what deserves to become durable memory, and how that memory remains trustworthy.

---

## 7. Design Principles

### 7.1 Local First

The default system must work locally.

Remote storage, cloud sync, or external write paths require explicit design and approval.

### 7.2 Privacy First

Secrets and sensitive data must not be stored.

Memory export is privacy-sensitive.

### 7.3 Audit First

Every durable write, update, supersession, deletion, migration, import, and export must be auditable.

### 7.4 Correction First

Memory must be correctable.

Stale memory should be marked, superseded, archived, or tombstoned instead of silently trusted.

### 7.5 Retrieval Is Not Proof

Vector similarity, tag resonance, and search ranking are retrieval signals.

They do not prove truth.

Repository reality, current user instruction, and observed command output outrank memory.

### 7.6 Powerful Later, Trustworthy First

Do not implement advanced TagMemo, EPA, residual pyramid, or dream-like association before the basic memory core is safe, tested, and auditable.

---

## 8. Memory Object Direction

The project should evolve toward a schema family that can express:

- `MemoryRecord`
- `MemoChunk`
- `Tag`
- `KnowledgeChunk`
- `AgentProfile`
- `ProjectContext`
- `TaskContext`
- `Checkpoint`
- `Handoff`
- `AuditEvent`
- `Tombstone`
- `MemoryProposal`
- `MemoryMigration`

A durable memory record should eventually support:

- `id`
- `type`
- `scope`
- `summary`
- `content`
- `tags`
- `source`
- `confidence`
- `sensitivity`
- `status`
- `created_at`
- `updated_at`
- `provenance`
- `supersedes`
- `superseded_by`
- `tombstone_reason`
- `retention_policy`
- `audit_refs`

The schema must distinguish:

- project facts
- user preferences
- agent preferences
- checkpoints
- handoff summaries
- knowledge chunks
- temporary notes
- stale records
- deleted/tombstoned records

Do not mix all memory into one shapeless blob.

---

## 9. Architecture Direction

Repository reality has already proved the active stack: the current implementation is an independent CommonJS JavaScript local service. Future TypeScript migration, if desired, is a separate high-risk refactor and not part of ordinary roadmap execution.

Suggested high-level modules:

```text
src/
  core/
  storage/
  recall/
  adapters/
  cli/
```

Module responsibilities:

- `core/` defines the memory domain services, application flows, and MCP tool-facing behavior.
- `storage/` owns persistence adapters such as JSONL, SQLite, or future vector stores.
- `recall/` owns lexical, metadata, tag, vector, hybrid search, ranking, deduplication, and VCP-style memory intelligence.
- `adapters/` owns Codex MCP, VCP passive memory, VCP active memory, and LightMemo compatibility surfaces.
- `cli/` owns local inspection, validation, migration, compare/rollback, provider, and runtime diagnostic commands.

Future governance modules such as policy, sanitize, audit, checkpoint, import/export, and admin surfaces should fit around this existing layout instead of replacing it.

Architecture must preserve boundaries.

Memory writing policy must not be buried inside MCP presentation code.

---

## 10. Storage Strategy

Current storage is already beyond a Phase 1 starter model and must be preserved.

Current storage surfaces include:

- diary-compatible files
- SQLite shadow store
- vector index artifacts
- candidate cache
- chat history index
- write and recall audit logs

Future storage options:

- USearch
- Qdrant
- LanceDB
- embedding cache
- hybrid index
- pluggable storage adapters

Future storage work should be fixture-backed, reversible, and compatible with the current diary / SQLite / vector / audit chain. External vector infrastructure should remain optional and should not replace local-first behavior without an explicit migration design.

---

## 11. Retrieval Strategy

Retrieval should evolve in layers:

1. Exact / keyword retrieval.
2. Metadata and scope filtering.
3. Tag retrieval.
4. Time and status filtering.
5. Deduplication.
6. Reranking.
7. Vector retrieval.
8. Hybrid retrieval.
9. TagMemo association.
10. Background association.

Retrieval output must distinguish:

- verified current fact
- memory candidate
- stale memory
- superseded memory
- low-confidence memory
- sensitive or redacted memory

The agent must not treat retrieval results as unquestionable truth.

---

## 12. Multi-Agent Strategy

`codex-memory` must support future multi-agent workflows.

Target model:

- workers retrieve relevant memory
- workers create memory proposals
- commander/reviewer deduplicates and approves
- only approved proposals become durable memory
- all durable writes create audit events
- conflicting memory is marked and resolved instead of silently merged

Workers should not freely write long-term memory without policy checks.

Many agents without memory governance will only produce faster confusion.

---

## 13. Phase Roadmap

This phase roadmap is the long-term evolution model. The current repository has already completed the starter local memory path and is in Phase E maintenance/refinement with HTTP MCP, diary-compatible writes, SQLite shadow storage, vector/profile artifacts, active-memory compatibility, compare/rollback harnesses, and gate workflows.

Do not interpret Phase 0 or Phase 1 below as the current next task.

### Phase 0 — Governance Foundation

Goal:

Define the project before implementing the system.

Deliverables:

- `AGENTS.md`
- `PROJECT_GOAL.md`
- `README.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `MEMORY_POLICY.md`
- `VALIDATION.md`

Historical note: early greenfield drafts used `agent.md`; this repository uses `AGENTS.md`.

Acceptance:

- project goal is clear
- non-goals are clear
- VCP parity target is documented
- Codex governance target is documented
- first implementation milestone is bounded
- Codex can safely continue from docs

### Phase 1 — Local Memory Core

Goal:

Build the smallest safe local memory kernel.

Deliverables:

- basic TypeScript project setup
- `MemoryRecord` schema
- local JSONL or SQLite storage adapter
- `record_memory`
- `search_memory`
- `memory_overview`
- secret detector / redactor
- audit log
- unit tests

Acceptance:

- can write a valid memory
- can reject or redact secret-like content
- can retrieve by keyword
- can inspect memory overview
- can create audit events
- tests pass

### Phase 2 — VCP-Compatible Data Model

Goal:

Represent VCP-style memory structures.

Deliverables:

- `MemoChunk`
- `Tag`
- `KnowledgeChunk`
- `AgentProfile`
- `ProjectContext`
- `Checkpoint`
- `Handoff`
- `Tombstone`
- import/export draft

Acceptance:

- can express main VCP memory object families
- can mark stale/superseded/deleted records
- can import/export sample data safely
- tests cover model conversion

### Phase 3 — Hybrid Retrieval

Goal:

Move from simple search to controlled recall.

Deliverables:

- keyword search
- metadata filter
- tag filter
- scope filter
- time filter
- deduplication
- reranking interface
- vector adapter interface

Acceptance:

- scoped search returns relevant records
- stale records are distinguishable
- duplicate records do not dominate results
- retrieval tests pass

### Phase 4 — TagMemo / Semantic Association

Goal:

Implement VCP-inspired tag intelligence.

Deliverables:

- tag graph
- directed tag sequence
- tag weights
- semantic gravity interface
- related-memory expansion
- explainable association trace

Acceptance:

- tags can expand related memories
- expansion is bounded
- association path is inspectable
- irrelevant expansion is controlled

### Phase 5 — Advanced Memory Intelligence

Goal:

Implement deeper VCP-style memory cognition.

Deliverables:

- EPA-style projection analysis
- Residual Pyramid style decomposition
- SVD/PCA semantic basis support
- memory compaction
- novelty detection
- coherence scoring
- background association prototype

Acceptance:

- repeated content can be compressed
- novelty can be detected
- residual information can be preserved
- background association remains inspectable

### Phase 6 — MCP and Multi-Agent Integration

Goal:

Expose governed memory tools to Codex and workers.

Deliverables:

- MCP server
- `record_memory`
- `search_memory`
- `memory_overview`
- `update_memory`
- `supersede_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `audit_memory`
- worker memory proposal flow

Acceptance:

- Codex can retrieve memory safely
- Codex can propose/write memory through policy
- worker proposals can be reviewed
- durable writes are audited

### Phase 7 — Ecosystem Integration

Goal:

Become the shared memory spine across the user's agent ecosystem.

Deliverables:

- VCPToolBox integration plan
- codex-router integration plan
- Photo Studio OS integration plan
- migration tools
- permission/scoping model
- observability/admin interface draft

Acceptance:

- projects can have separate scopes
- shared reusable memory can be retrieved safely
- sensitive memory does not flow across scopes
- integration remains local-first and auditable

---

## 14. First Milestone Scope

Historical first milestone scope:

A blank implementation's first milestone must remain intentionally small.

Allowed:

- project skeleton
- docs
- schema draft
- local storage
- basic record/search/overview
- redaction
- audit log
- tests

Not allowed in the first milestone unless explicitly approved:

- full TagMemo implementation
- EPA
- Residual Pyramid
- dream/background association
- full VCP migration
- external vector database dependency
- cloud sync
- production deployment
- broad automation
- uncontrolled import of real memory data

First make the memory safe.

Then make it deep.

Current repository note: the safe local memory spine already exists. Future milestones should start from the Phase E maintenance baseline and preserve current contracts while adding governance, supersession, forgetting, import/export, and multi-agent arbitration incrementally.

---

## 15. Validation Standard

Every phase must define:

- what changed
- how it was validated
- what was not validated
- remaining risk
- rollback or correction path
- next safe step

Use result labels:

- `COMPLETED_VALIDATED`
- `COMPLETED_UNVALIDATED`
- `PARTIAL`
- `BLOCKED`
- `FAILED`

A feature is not complete merely because code exists.

A feature is complete only when behavior is clear and validation status is honest.

---

## 16. Completion Definition

The full project is complete only when `codex-memory` can safely reproduce and evolve the practical capabilities of the VCP memory system in a Codex-compatible form.

Completion requires:

- VCP-compatible memory modeling
- safe durable writes
- reliable retrieval
- hybrid search
- tag-based association
- memory compaction
- stale/supersession handling
- deletion/tombstone flow
- audit logging
- secret protection
- MCP access
- multi-agent usability
- migration path
- validation suite
- documentation
- local-first operation

Until then, each phase should be treated as a controlled step toward memory parity, not as the final system.

---

## 17. Project North Star

`codex-memory` exists to give agents a trustworthy past.

Not a perfect past.

Not an infinite past.

A governed past that can be searched, questioned, corrected, and carried forward.

Time is the material.

Governance is the spine.

Validation is the proof.
