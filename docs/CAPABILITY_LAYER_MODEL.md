# Capability Layer Model

`codex-memory` capabilities are layered. Higher layers must not be claimed until
their gates have passed.

## L0: Default MCP Read-Only Surface

Default exposed tools:

- `search_memory`
- `memory_overview`
- `audit_memory`

Hidden by default:

- `record_memory`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This layer proves that Codex can perform bounded, governed read-only memory
access without exposing write or destructive mutation tools by default.

## L1: Native Realtime Read

Codex reads through:

```text
Codex -> /mcp/codex-memory -> /mcp/vcp-native -> VCPToolBox native memory
```

Required proof:

- native target binding
- native read attempted
- native read succeeded
- native receipt present
- audit receipt present
- fallback distinction
- low-disclosure response
- scope and visibility enforcement

## L2: Memory Context Package

Add `prepare_memory_context`.

This is not a generic search tool. It is a task-start context builder that
returns a bounded memory context package:

- must-know facts
- recent decisions
- current state
- blockers
- risks
- forbidden assumptions
- recommended next step
- source breakdown
- audit receipt

Implementation should reuse the existing local recall and support stack:

- `KnowledgeBaseRecallPipeline`
- `CandidateGenerator`
- `TagMemoEngine`
- scope and lifecycle filters
- SQLite shadow
- vector index
- `AuditLogStore`
- `MemoryOverviewService`

The layer converts bounded search results into a task-oriented memory context
package. It is not a from-zero recall rewrite.

This layer is the first step toward a near-model-memory experience.

## L3: Task-Start Automatic Recall

Codex workflow or task wrappers call `prepare_memory_context` before meaningful
task execution.

If memory is unavailable, Codex must mark the state as `memory_unavailable` and
must not pretend to remember.

## L4: Memory Delta Proposal

Add `propose_memory_delta`.

Default behavior:

- proposal-only
- no durable mutation
- no production write
- evidence required
- low disclosure

This layer lets Codex suggest what should be remembered after a task without
writing production memory by default.

It should reuse the local write pipeline and write governance for proposal,
staging, validation, and audit receipt. It must not become default production
write.

## L5: Operator-Only Full Surface

Operator-only tools:

- `record_memory`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

Required properties:

- explicit env only
- not hardened
- local/operator-only
- exact approval for mutation paths
- audit receipt
- rollback posture

Operator-only does not mean Codex default.

## L6: Native Write Production

Production native write requires:

- exact approval enforcement
- native side-effect receipt
- real-root durable write proof
- audit receipt
- rollback posture
- verify-write
- failure recovery proof
- output disclosure budget proof

Read proof is not write proof.

## L7: Default Runtime Expansion

Only after observation and external review may the default Codex runtime policy
be expanded.

Recommended default target before L7:

- read tools
- `prepare_memory_context`
- proposal-only memory delta

Not recommended as default:

- unapproved `record_memory`
- `commit_memory_delta`
- `tombstone_memory`
- `supersede_memory`

## Release Naming

Allowed examples:

```text
v0.2.0-readonly-context-rc
v0.3.0-operator-full-surface-rc
v0.4.0-native-write-proof-rc
```

Forbidden examples:

```text
full-vcp-memory
complete-realtime-memory
production-write-ready
model-memory-complete
```
