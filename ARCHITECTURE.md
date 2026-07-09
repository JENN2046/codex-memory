# ARCHITECTURE.md — codex-memory

## 1. Architecture Purpose

`codex-memory` is a governed MCP bridge and auxiliary local memory runtime for
Codex. Its product goal is to let Codex use VCPToolBox native memory through
governed tools, not to reimplement VCPToolBox as a competing memory
intelligence owner.

This architecture defines how the existing local memory, SQLite shadow, vector
index, recall pipeline, and write-governance pipeline are retained and used as
fallback, audit, validation, compatibility, offline continuity, context
packaging, and proposal staging around the VCPToolBox native memory runtime.

Current repository reality: the local memory core already exists. The active
roadmap is the imported near-model-memory plan pack, with Phase 3
`prepare_memory_context` as the immediate next milestone. This document is an
evolution guide; it must not be read as a request to rebuild the current
CommonJS runtime from a new Phase 1 skeleton.

The architecture must support two truths at the same time:

1. The final plan-pack target is large: governed near-model-memory experience
   for Codex through VCPToolBox native memory plus local support pipelines.
2. Each implementation step must remain small, testable, reversible, and safe.

This document describes the intended architecture, not a claim that every module already exists.

---

## 2. System Role

`codex-memory` sits between Codex and memory runtimes.

```text
Codex / Agents / Workers
        |
        v
MCP Tools / CLI / Local API
        |
        v
Policy + Sanitization + Audit
        |
        v
Governed Runtime Router
        |
        +--> VCPToolBox native memory
        |      primary source of truth / memory intelligence owner
        |
        +--> Local memory support runtime
               fallback / audit / validation fixture / compatibility /
               offline continuity / context packaging / proposal staging
```

It does not execute arbitrary project tasks.

It does not replace `codex-router`.

It does not replace VCPToolBox runtime tools.

It governs who can access memory, which runtime is targeted, how much output
can be disclosed, how evidence is recorded, and when local fallback, staging,
or audit support may be used. VCPToolBox native memory remains the final owner
of memory intelligence and production durable memory behavior.

---

## 3. Architecture Principles

### 3.1 Local First

The default runtime must work locally.

External services, cloud sync, remote databases, and live writes are optional future extensions and require explicit approval.

### 3.2 Governance Before Intelligence

Secret detection, write policy, audit logging, and correction paths must exist before advanced semantic intelligence becomes central.

A powerful memory system without governance becomes pollution at machine speed.

### 3.3 Retrieval Is Candidate Evidence

Search results, vector similarity, TagMemo resonance, and background association are candidates.

They are not proof.

Current repository state, user instruction, observed command output, and validation results outrank memory.

### 3.4 Every Durable Write Must Be Auditable

A durable write must leave an audit event.

The system should be able to answer:

- what was written
- why it was written
- who or what requested it
- what scope it belongs to
- whether it was sanitized
- whether it superseded older memory
- how it can be corrected or forgotten

### 3.5 Advanced Recall Heuristics Must Be Layered

TagMemo, semantic gravity, EPA, Residual Pyramid, SVD/PCA basis modeling, and
background association are experimental recall heuristics inside the local
support runtime.

They may help rank, group, explain, or package candidates. They must not be
presented as production memory intelligence, and they must not silently mutate
durable memory.

---

## 4. High-Level Layers

```text
Layer 7  Ecosystem Integration
Layer 6  MCP / CLI / Agent Interfaces
Layer 5  Experimental Recall Heuristics
Layer 4  Retrieval Engine
Layer 3  Memory Governance
Layer 2  Storage Core
Layer 1  Memory Schema
Layer 0  Project Governance
```

### Layer 0 — Project Governance

Files:

- `AGENTS.md`
- `PROJECT_GOAL.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `MEMORY_POLICY.md`
- `VALIDATION.md`

Historical greenfield plans may mention `agent.md`; the active repository instruction file is `AGENTS.md`.

Purpose:

- define mission
- define safety rules
- define phase plan
- define non-goals
- define validation standard

### Layer 1 — Memory Schema

Core object families:

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

Purpose:

- give every memory identity, scope, status, and provenance
- separate memory types instead of storing shapeless text
- support VCP-compatible modeling

### Layer 2 — Storage Core

Existing retained local storage:

- diary-compatible local memory files
- SQLite shadow store
- vector index
- embedding cache
- candidate cache
- audit stores
- reconcile / validation support state

Purpose:

- persist local support memory safely
- preserve audit events
- provide fallback, validation fixtures, compatibility, offline continuity, and
  proposal staging
- support `prepare_memory_context` when native reads need local fallback or
  audit corroboration
- provide predictable local behavior without becoming the production memory
  intelligence owner

### Layer 3 — Memory Governance

Modules:

- write policy
- sensitivity policy
- trust policy
- retention policy
- supersession policy
- deletion/tombstone policy
- migration policy
- audit policy

Purpose:

- prevent memory pollution
- prevent secret leakage
- prevent stale memory from becoming false truth
- make memory correctable and deletable

### Layer 4 — Retrieval Engine

Existing retained retrieval modules:

- `KnowledgeBaseRecallPipeline`
- `CandidateGenerator`
- `TagMemoEngine`
- scope filters
- lifecycle filters
- reranking / grouping / candidate cache
- vector index access
- `MemoryOverviewService`
- `AuditLogStore`

Retrieval modes:

- exact lookup
- keyword search
- metadata filtering
- scope filtering
- tag retrieval
- time/status filtering
- deduplication
- reranking
- vector search
- hybrid retrieval

Purpose:

- return relevant memory candidates
- make confidence and freshness visible
- distinguish stale/superseded/current memory
- avoid duplicate dominance
- convert search results into task-oriented memory context packages

### Layer 5 — Experimental Recall Heuristics

VCP-inspired local support engines:

- TagMemo engine
- tag graph
- directed tag sequence engine
- semantic gravity engine
- resonance expansion engine
- EPA-style projection analysis
- Residual Pyramid style decomposition
- SVD/PCA semantic basis modeling
- memory compaction engine
- novelty detection
- coherence scoring
- background association engine

Purpose:

- improve candidate generation, ranking, grouping, and context packaging
- support semantic association across time as recall evidence
- compress or summarize local support context without destroying signal
- remain experimental unless backed by specific quality gates
- never become the primary memory intelligence owner

### Layer 6 — MCP / CLI / Agent Interfaces

External surfaces:

- MCP server
- local CLI
- local API
- test harness
- future admin/observability UI

Agent-facing tools:

Current default public MCP tools are read-only:

- `search_memory`
- `memory_overview`
- `audit_memory`

Near-term default read-only context tool:

- `prepare_memory_context`

Proposal/staging surfaces:

- `propose_memory_delta`

Operator-only or approval-only governance surfaces:

- `record_memory`
- `validate_memory`
- `commit_memory_delta`
- `tombstone_memory`
- `supersede_memory`

Purpose:

- let Codex and workers use memory safely
- keep memory writes intentional
- expose inspection and audit

### Layer 7 — Ecosystem Integration

Targets:

- Codex Desktop
- Claude MCP client
- VCPToolBox donor/reference formats
- local migration and import/export dry-runs

Purpose:

- make `codex-memory` the governed Codex access path for VCPToolBox native
  memory and local support pipelines
- keep project scopes separate
- enable reusable cross-project memory context without privacy leakage

---

## 5. Suggested Repository Structure

Repository reality has already chosen the active implementation shape: this project is a CommonJS JavaScript repository with `src/core`, `src/storage`, `src/recall`, `src/adapters`, and `src/cli`.

The TypeScript-first tree below is a greenfield reference for future schema or governance work. It is not the current file layout, and it must not be used to justify replacing the existing runtime structure.

```text
codex-memory/
├─ agent.md
├─ AGENTS.md
├─ README.md
├─ PROJECT_GOAL.md
├─ ARCHITECTURE.md
├─ ROADMAP.md
├─ MEMORY_POLICY.md
├─ VALIDATION.md
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ index.ts
│  ├─ memory/
│  │  ├─ memory-record.ts
│  │  ├─ memory-types.ts
│  │  ├─ memory-status.ts
│  │  ├─ memory-writer.ts
│  │  ├─ memory-reader.ts
│  │  ├─ memory-updater.ts
│  │  ├─ memory-deleter.ts
│  │  └─ memory-overview.ts
│  ├─ storage/
│  │  ├─ storage-adapter.ts
│  │  ├─ jsonl-store.ts
│  │  ├─ sqlite-store.ts
│  │  ├─ index-store.ts
│  │  └─ backup.ts
│  ├─ retrieval/
│  │  ├─ retrieval-query.ts
│  │  ├─ lexical-search.ts
│  │  ├─ metadata-filter.ts
│  │  ├─ tag-search.ts
│  │  ├─ time-filter.ts
│  │  ├─ vector-search.ts
│  │  ├─ hybrid-search.ts
│  │  ├─ rerank.ts
│  │  └─ deduplicate.ts
│  ├─ policy/
│  │  ├─ write-policy.ts
│  │  ├─ sensitivity-policy.ts
│  │  ├─ trust-policy.ts
│  │  ├─ retention-policy.ts
│  │  ├─ deletion-policy.ts
│  │  └─ migration-policy.ts
│  ├─ sanitize/
│  │  ├─ secret-detector.ts
│  │  ├─ redactor.ts
│  │  └─ patterns.ts
│  ├─ audit/
│  │  ├─ audit-event.ts
│  │  ├─ audit-log.ts
│  │  └─ audit-query.ts
│  ├─ checkpoint/
│  │  ├─ checkpoint-record.ts
│  │  ├─ checkpoint-store.ts
│  │  ├─ handoff-record.ts
│  │  └─ handoff-store.ts
│  ├─ vcp/
│  │  ├─ memo-chunk.ts
│  │  ├─ tag.ts
│  │  ├─ knowledge-chunk.ts
│  │  ├─ tag-graph.ts
│  │  ├─ tag-sequence.ts
│  │  ├─ tagmemo-engine.ts
│  │  ├─ semantic-gravity.ts
│  │  ├─ epa.ts
│  │  ├─ residual-pyramid.ts
│  │  └─ compaction.ts
│  ├─ mcp/
│  │  ├─ server.ts
│  │  ├─ tools/
│  │  │  ├─ record-memory.ts
│  │  │  ├─ search-memory.ts
│  │  │  ├─ memory-overview.ts
│  │  │  ├─ update-memory.ts
│  │  │  ├─ supersede-memory.ts
│  │  │  ├─ forget-memory.ts
│  │  │  ├─ checkpoint-memory.ts
│  │  │  ├─ handoff-memory.ts
│  │  │  └─ audit-memory.ts
│  │  └─ tool-contracts.ts
│  ├─ cli/
│  │  ├─ cli.ts
│  │  └─ commands/
│  └─ config/
│     ├─ defaults.ts
│     └─ runtime-config.ts
├─ tests/
│  ├─ memory-write.test.ts
│  ├─ memory-search.test.ts
│  ├─ sensitivity-policy.test.ts
│  ├─ audit-log.test.ts
│  ├─ checkpoint.test.ts
│  ├─ vcp-models.test.ts
│  └─ mcp-tools.test.ts
└─ data/
   ├─ memories.jsonl
   ├─ checkpoints.jsonl
   ├─ audit.jsonl
   └─ indexes/
```

The structure should be created gradually.

Do not create empty complexity for modules that are not part of the current phase.

It is acceptable to document future modules before implementing them.

---

## 6. Core Data Model Direction

### 6.1 MemoryRecord

`MemoryRecord` is the base durable memory unit.

Suggested fields:

```ts
type MemoryStatus =
  | "active"
  | "stale"
  | "superseded"
  | "tombstoned"
  | "archived";

type SensitivityLevel =
  | "public"
  | "internal"
  | "private"
  | "sensitive"
  | "redacted";

type MemoryRecord = {
  id: string;
  type: string;
  scope: {
    project?: string;
    repo?: string;
    user?: string;
    agent?: string;
    task?: string;
  };
  summary: string;
  content: string;
  tags: string[];
  source: {
    kind: "user" | "repo" | "command" | "doc" | "agent" | "import" | "manual";
    ref?: string;
  };
  confidence: number;
  sensitivity: SensitivityLevel;
  status: MemoryStatus;
  created_at: string;
  updated_at: string;
  provenance?: string[];
  supersedes?: string[];
  superseded_by?: string;
  tombstone_reason?: string;
  audit_refs?: string[];
};
```

### 6.2 VCP-Compatible Objects

`MemoChunk`, `Tag`, and `KnowledgeChunk` should be modeled as first-class objects or typed specializations.

They should not be collapsed into plain text.

Suggested concept mapping:

```text
VCP MemoChunk       -> durable memory / conversation / project chunk
VCP Tag             -> tag graph node / semantic label / resonance point
VCP KnowledgeChunk  -> knowledge base record / indexed document chunk
TagMemo             -> association layer over tags and memory records
EPA                 -> projection analysis over embedding or semantic basis
Residual Pyramid    -> semantic decomposition and compaction layer
```

### 6.3 AuditEvent

Every durable mutation should create an `AuditEvent`.

Mutation types:

- record
- update
- supersede
- tombstone
- delete
- import
- export
- migrate
- compact
- validate

Audit event should store metadata and counts, not secret content.

---

## 7. Write Pipeline

All durable writes should pass through a controlled pipeline. For the
near-model-memory plan pack, the existing local write pipeline is retained for:

- `propose_memory_delta`
- staging
- local validation
- audit receipts
- compatibility/offline continuity

It must not become default production write. Production native write remains
separate and requires exact approval, native receipt, verify-write, rollback
posture, and later gates.

```text
Input
  |
  v
Intent Classification
  |
  v
Scope Resolution
  |
  v
Sensitivity Scan
  |
  v
Redaction / Rejection
  |
  v
Duplicate Check
  |
  v
Trust / Confidence Assignment
  |
  v
MemoryRecord / MemoryProposal Construction
  |
  v
Proposal / Staging / Approved Storage Write
  |
  v
Index Update
  |
  v
Audit Event
  |
  v
Result Summary
```

### Write Rules

A write must not happen if:

- content contains secrets that cannot be safely redacted
- scope is unclear for durable memory
- source/provenance is missing for a factual claim
- the memory is temporary noise
- it duplicates an active existing record without supersession
- it writes outside the configured local store
- it requires remote write without approval

### Write Output

A write response should include:

```text
Memory operation:
Records written:
Records updated/superseded:
Records rejected:
Sensitive data handling:
Audit event:
Validation:
```

Default `propose_memory_delta` output should be proposal-only and low
disclosure. `commit_memory_delta` is operator-only / approval-only and must
remain separate from the default Codex runtime.

---

## 8. Retrieval Pipeline

Retrieval should be controlled and explainable. `prepare_memory_context` should
not start from zero; it should call the existing recall and support services,
then transform their bounded results into a task-oriented memory context
package.

```text
Query
  |
  v
Scope Filter
  |
  v
Status Filter
  |
  v
Keyword / Metadata / Tag / Vector Candidates
  |
  v
Deduplication
  |
  v
Reranking
  |
  v
Freshness / Confidence Annotation
  |
  v
Result Explanation
```

`prepare_memory_context` implementation mapping:

```text
Task request
  |
  v
Scope / lifecycle / disclosure budget policy
  |
  v
KnowledgeBaseRecallPipeline
  |
  +--> CandidateGenerator
  +--> TagMemoEngine experimental heuristics
  +--> vector index / candidate cache
  +--> scope and lifecycle filters
  |
  v
MemoryOverviewService + AuditLogStore support projections
  |
  v
Task-oriented memory context package
```

### Retrieval Rules

Retrieval should:

- prefer scoped memory
- include stale/superseded status when relevant
- avoid exposing sensitive content
- avoid returning raw secret-like values
- make confidence visible
- distinguish retrieved memory from verified truth

### Retrieval Output

A retrieval result should include:

- id
- summary
- relevant excerpt or redacted content
- type
- scope
- tags
- confidence
- status
- source
- updated_at
- why it matched

---

## 9. Supersession and Tombstone Flow

Memory must be able to age.

### Supersession

Use supersession when a newer memory replaces an older memory.

```text
Old memory: status = superseded
New memory: supersedes = [old_id]
Old memory: superseded_by = new_id
Audit: supersede event
```

### Tombstone

Use tombstone when memory should no longer be used but the deletion event itself matters.

```text
Memory: status = tombstoned
Memory: content may be redacted or removed depending on policy
Memory: tombstone_reason set
Audit: tombstone event
```

### Hard Delete

Hard delete is exceptional.

It requires explicit approval unless the user clearly requested deletion of the exact record.

---

## 10. Experimental Recall Heuristic Modules

The system may expose advanced VCP-style recall heuristics as modular engines.
They are not the primary memory intelligence layer; VCPToolBox native memory
keeps that role. These modules should feed `search_memory` ranking and
`prepare_memory_context` packaging, not replace native memory behavior.

### 10.1 TagMemo Engine

Purpose:

- associate memory through tags
- support tag resonance
- support directed tag sequences
- expand related memory candidates

Inputs:

- tags
- query
- memory records
- tag graph
- past tag sequences

Outputs:

- related tags
- related memory ids
- association trace
- weights

### 10.2 Semantic Gravity Engine

Purpose:

- calculate how strongly memories/tags attract a query or context
- support bounded associative recall

Outputs should remain explainable.

### 10.3 EPA Engine

Purpose:

- analyze embedding or semantic projection behavior
- identify dominant semantic axes
- support candidate ranking and context packaging experiments

EPA must not become a black box that silently rewrites memory truth.

### 10.4 Residual Pyramid Engine

Purpose:

- decompose memory into base signal and residual novelty
- support recall/summary experiments
- prevent repeated memories from drowning new signal

### 10.5 Compaction Engine

Purpose:

- compress long-term memory safely
- preserve source links
- avoid deleting unique signal
- create audit events

Compaction must be reversible or at least inspectable.

### 10.6 Background Association Engine

Purpose:

- support future dream-like or background associative memory processing
- generate memory proposals, not direct durable writes

Background association must not silently mutate durable memory.

---

## 11. MCP Tool Architecture

MCP tools should be thin interface layers.

They should call core services instead of owning business logic.

```text
MCP Tool
  |
  v
Input Validation
  |
  v
Memory Service / Policy / Retrieval
  |
  v
Audit
  |
  v
Structured Response
```

Current default public tools:

- `search_memory`
- `memory_overview`
- `audit_memory`

Near-term default read-only context tool:

- `prepare_memory_context`

Proposal/staging tool:

- `propose_memory_delta`

Operator-only or approval-only tools:

- `record_memory`
- `commit_memory_delta`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

Legacy or future governance names that may remain internal or compatibility-only:

- `update_memory`
- `forget_memory`
- `checkpoint_memory`
- `handoff_memory`
- `import_memory`
- `export_memory`

The default Codex runtime must not expose production write or destructive
mutation tools.

### Tool Response Discipline

Every tool response should be structured, compact, and safe.

It should never print secrets.

It should expose validation state.

---

## 12. CLI Architecture

The CLI is for local inspection, validation, and maintenance.

Possible commands:

```bash
codex-memory record
codex-memory search
codex-memory overview
codex-memory audit
codex-memory validate
codex-memory compact --dry-run
codex-memory import --dry-run
codex-memory export --redacted
```

Dangerous commands should require explicit flags:

```bash
codex-memory forget --id <id> --confirm
codex-memory migrate --dry-run
codex-memory migrate --apply --confirm
```

---

## 13. Configuration Direction

Runtime config should define:

- storage path
- audit path
- index path
- default project scope
- redaction behavior
- maximum retrieval results
- allowed tool operations
- vector provider settings if enabled
- export/import policy
- migration policy

Sensitive values should not be stored in normal config.

Use environment variables or external secret management only when needed, and never record raw secrets into memory.

---

## 14. Validation Architecture

Validation must be part of the architecture, not a final decoration.

Required test families:

- schema validation
- storage read/write
- audit event creation
- secret detection/redaction
- record memory flow
- search memory flow
- stale/superseded handling
- tombstone handling
- duplicate detection
- import/export safety
- MCP tool contracts
- client proposal / approval flow
- VCP model compatibility

Historical Phase 1 minimum tests:

- write a valid memory
- reject or redact secret-like content
- retrieve by keyword
- create audit event
- generate memory overview

Current repository changes should instead choose validation from README, `VALIDATION.md`, `AGENTS.md`, and the layer-specific test/gate matrix.

---

## 15. Phase-Specific Architecture

The phase diagrams below are retained as an evolution model. They describe how a blank implementation should grow, not the current repository state.

### Phase 0 Architecture

Docs only.

No code required.

Goal:

- define the project
- prevent scope drift
- give Codex a safe route

### Phase 1 Architecture

Minimal local system:

```text
MCP/CLI optional
  |
  v
Memory Writer / Reader
  |
  v
Policy + Redaction + Audit
  |
  v
JSONL or SQLite Store
```

No advanced VCP intelligence yet.

### Phase 2 Architecture

Add VCP-compatible models:

```text
MemoryRecord
  |
  +-- MemoChunk
  +-- KnowledgeChunk
  +-- Checkpoint
  +-- Handoff

Tag
  |
  +-- Tag Graph Draft
```

### Phase 3 Architecture

Add controlled retrieval:

```text
Query
  |
  +-- keyword
  +-- metadata
  +-- tag
  +-- status/time
  |
  v
dedup + rerank
```

Vector adapter can exist but should not dominate the architecture.

### Phase 4+ Architecture

Add VCP intelligence modules as independent engines.

They should consume and propose memory transformations.

They should not bypass policy, audit, or validation.

---

## 16. Integration Boundaries

### VCPToolBox

`codex-memory` may import/export compatible memory structures and eventually expose APIs to VCPToolBox.

It should not directly replace VCP runtime tools.

### Codex Desktop

Codex Desktop is the primary client for `codex-memory` through the HTTP MCP mainline.

`codex-memory` should not take over task execution or Codex configuration management.

### Claude MCP Client

Claude may use `codex-memory` through MCP-compatible local client integration.

Claude should receive only scoped memory allowed by policy.

### Other Local Systems

Other local tools are not first-class service targets.

They may contribute fixtures, donor behavior, or migration references, but they should not expand the product target beyond Codex and Claude without a new explicit decision.

---

## 17. Failure Modes to Design Against

The architecture must defend against:

- memory pollution from guesses
- stale memory overriding current reality
- secret leakage into memory
- duplicate memory flooding retrieval
- uncontrolled cross-project memory bleed
- silent background writes
- irreversible deletion without audit
- broad migration corruption
- vector similarity treated as truth
- Codex and Claude writing conflicting memories
- docs claiming features that code does not implement

These are not edge cases.

They are the natural failure modes of memory systems.

---

## 18. First Implementation Recommendation

Historical first implementation guidance:

A blank implementation should not attempt full VCP parity.

Recommended Phase 1 implementation slice:

```text
MemoryRecord schema
JSONL storage
record_memory service
search_memory service
memory_overview service
secret detector/redactor
audit log
basic tests
README usage examples
```

This is the smallest useful spine.

The current repository has already passed this starter point. Future work should preserve the existing diary / SQLite / vector / audit / MCP / active-memory chain and then add VCP-compatible governance in small validated steps.

For a blank implementation, after this passes validation, add VCP-compatible models.

Then add hybrid retrieval.

Then add TagMemo-style association.

Only after the memory is safe should it become deep.

---

## 19. Completion Bar

The architecture is successful when the project can grow without losing these properties:

- local-first
- auditable
- privacy-safe
- correctable
- deletable
- VCP-compatible
- Codex-friendly
- Claude-friendly
- validation-driven

The system must not merely remember.

It must remember with discipline.
