# Codex Memory Final Goal

## Goal

`codex-memory` is a governed external memory runtime for Codex.

Its final goal is:

```text
Codex gets complete, realtime, governed access to VCPToolBox native memory
through MCP, the codex-memory governance layer, and the VCPToolBox native
memory runtime, then uses that access through a memory context package and
task-start automatic recall to approach a near-model-memory experience.
```

This is not true model-internal memory. It is a governed external runtime that
can make Codex behave closer to a system that naturally remembers the relevant
project state.

## Foundation Goal

Codex must have governed access to VCPToolBox native memory for:

- search
- overview
- audit
- record
- validate
- tombstone
- supersede
- audit receipt
- rollback posture
- output disclosure budget
- runtime target binding
- scope and visibility isolation

VCPToolBox native memory remains the source of truth and behavior owner.
`codex-memory` must not become a competing memory intelligence owner.

The active target is complete implementation of the imported near-model-memory
plan pack, not only one phase of it.

## Experience Goal

Codex should receive a task-start memory context package before meaningful
work begins.

That package should contain bounded, low-disclosure projections of:

- must-know facts
- recent decisions
- current state
- blockers
- risks
- forbidden assumptions
- recommended next step
- source breakdown
- audit receipt

The intended experience is not "the user asks Codex to search memory." The
intended experience is that Codex starts each task already carrying the relevant
governed memory context.

`prepare_memory_context` should reuse the existing local recall stack instead
of starting from zero:

- `KnowledgeBaseRecallPipeline`
- `CandidateGenerator`
- `TagMemoEngine`
- scope and lifecycle filters
- SQLite shadow
- vector index
- `AuditLogStore`
- `MemoryOverviewService`

Its job is to transform bounded search results and support projections into a
task-oriented context package.

## Local Memory Role

Local memory is auxiliary only:

- fallback
- audit
- validation fixture
- compatibility
- offline continuity
- context packaging
- proposal/staging

Fallback must always be marked as fallback. It must never be presented as native
realtime VCPToolBox memory.

The local write pipeline and write governance are retained for
`propose_memory_delta`, staging, validation, and audit. They are not default
production write.

EPA, Residual Pyramid, and advanced TagMemo narratives are experimental recall
heuristics. They may assist ranking, grouping, explanation, and context
packaging, but they are not production memory intelligence claims.

## Success Standard

The project succeeds when Codex can use VCPToolBox native memory through a
governed, low-disclosure, auditable runtime path, and when task-start memory
context makes relevant long-term memory available without relying on manual
tool use.

Every capability claim must be bound to:

- date
- commit
- runtime
- evidence artifact
- gate result
- scope limitation
