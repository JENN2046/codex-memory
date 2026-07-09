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

## Local Memory Role

Local memory is auxiliary only:

- fallback
- audit
- validation fixture
- compatibility
- offline continuity

Fallback must always be marked as fallback. It must never be presented as native
realtime VCPToolBox memory.

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
