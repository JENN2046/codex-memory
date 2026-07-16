# Capability Layer Model

`codex-memory` capabilities are layered. Higher layers must not be claimed until
their gates have passed.

## L0: Default MCP Read-Only Surface

Default exposed tools:

- `search_memory`
- `memory_overview`
- `audit_memory`
- `prepare_memory_context`
- `propose_memory_delta`

Hidden by default:

- `record_memory`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This layer proves that Codex can perform bounded, governed read-only memory
access, task-start context packaging, and proposal-only memory delta staging
without exposing commit, write, or destructive mutation tools by default.

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

`prepare_memory_context` is the default read-only task-start context builder.

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

Implementation uses governed native recall first. The existing local recall and
support stack is retained for explicit fallback, compatibility, audit, and
offline continuity:

- `KnowledgeBaseRecallPipeline`
- `CandidateGenerator`
- `TagMemoEngine`
- scope and lifecycle filters
- SQLite shadow
- vector index
- `AuditLogStore`
- `MemoryOverviewService`

The layer converts bounded search results into a task-oriented memory context
package. Every package identifies its source runtime and local results cannot be
presented as native. It is not a from-zero recall rewrite.

This layer is the first step toward a near-model-memory experience.

## L3: Task-Start Automatic Recall

Codex workflow or task wrappers call `prepare_memory_context` before meaningful
task execution.

If memory is unavailable, Codex must mark the state as `memory_unavailable` and
must not pretend to remember.

Current local implementation provides a task-start wrapper that derives task
fields, calls `prepare_memory_context`, and produces an injectable bounded
summary or a `memory_unavailable` receipt. This is local workflow wiring, not a
production runtime expansion or write proof.

## Context Package Quality Gate

The Phase 5 fixture/local quality gate for `prepare_memory_context` is present.
It runs a synthetic query suite through the context package builder and records:

- project fact recall
- historical decision recall
- current blocker recall
- user preference recall
- stale fact filtering
- conflict fact surfacing
- private isolation
- workspace isolation
- fallback distinction

Reports:

- `docs/near-model-memory-plan-pack/recall_quality_report.json`
- `docs/near-model-memory-plan-pack/recall_quality_report.md`

This gate is fixture/local dry-run evidence only. It is not live recall proof,
not production recall quality proof, not native read proof, and not write proof.

## L4: Memory Delta Proposal

`propose_memory_delta` is implemented as the default proposal-only task-end
memory delta tool.

Default behavior:

- proposal-only
- no durable mutation
- no production write
- evidence required
- low disclosure
- audit receipt
- rollback posture
- operator-only draft commit contract

This layer lets Codex suggest what should be remembered after a task without
writing production memory by default.

It reuses the local write governance proposal-mode contract for proposal,
staging, validation, and audit receipt. It must not become default production
write. `commit_memory_delta` is draft-only, operator-only, not public
registered, and not exposed by default.

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

Current local proof gate:

- `src/core/OperatorFullSurfaceProofGate.js`
- `tests/operator-full-surface-proof-gate.test.js`

The gate accepts only explicit env/operator full-surface evidence, rejects
hardened full-surface attempts, requires exact approval / audit receipt /
rollback posture / no-approval durable mutation blocking evidence, and keeps
`commit_memory_delta` out of public registration.

This is not native write production proof.

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

Current local Phase 8 P8-T1 preflight:

- `src/core/NativeWriteProductionProofContract.js`
- `tests/native-write-production-proof-contract.test.js`
- `docs/near-model-memory-plan-pack/native_write_contract_preflight_report.md`
- `src/core/NativeWriteRealRootProofReadinessGate.js`
- `tests/native-write-real-root-proof-readiness-gate.test.js`
- `docs/near-model-memory-plan-pack/real_root_write_readiness_gate_report.md`

This preflight defines `prepare_write`, `commit_write`, `verify_write`, and
`rollback_or_compensate` contract gates. It is local and fail-closed: it
requires future exact approval, real-root durable write evidence, native
side-effect receipt, audit receipt, rollback posture, failure recovery, and
low-disclosure proof, but it performs no runtime call and no native write.

The follow-on real-root readiness gate prepares category-only approval request
readiness for P8-T2/P8-T3/P8-T4. It requires real-root target evidence by safe
reference category, rollback drill planning, failure recovery planning, and
low-disclosure audit planning before a future approval request can be considered
ready. It does not submit approval requests, accept approval, execute native
write, run rollback/recovery drills, or prove production write.

This is not native write production proof.

## L7: Default Runtime Expansion

The current Phase 9 local gate preserves the default Codex runtime policy as a
hold state, not an expansion.

Current recommended default:

- read tools
- `prepare_memory_context`
- proposal-only memory delta

Gate implementation:

- `src/core/DefaultRuntimePolicyObservationGate.js`
- `tests/default-runtime-policy-observation-gate.test.js`
- `docs/near-model-memory-plan-pack/default_runtime_policy_observation_gate_report.md`

The gate accepts only read/context/proposal as the current default. It rejects
default runtime expansion without 30-day observation or equivalent dogfood
review plus external review, and it still does not auto-expand default runtime
after those evidence categories are present.

Not recommended as default:

- unapproved `record_memory`
- `validate_memory`
- `commit_memory_delta`
- `tombstone_memory`
- `supersede_memory`

Any future default policy reconsideration remains separate from operator-only
full surface, native write production, release, deploy, cutover, and readiness
claims.

## Release Naming

Current local Phase 10 gate:

- `src/core/ReleaseTagReadinessPolicyGate.js`
- `tests/release-tag-readiness-policy-gate.test.js`
- `docs/near-model-memory-plan-pack/release_tag_readiness_policy_gate_report.md`

The gate evaluates candidate milestone names, release note non-claims, and tag
approval packet evidence. It does not create tags, push tags, publish releases,
deploy, cut over, or claim readiness.

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

## Full Plan-Pack Completion Audit

Current local completion audit:

- `src/core/NearModelMemoryPlanPackCompletionAudit.js`
- `tests/near-model-memory-plan-pack-completion-audit.test.js`
- `docs/near-model-memory-plan-pack/completion_audit_report.md`

The audit maps Phase 0 through Phase 10 plus objective invariants into explicit
evidence checks. It exists to prevent narrow slices from being mistaken for full
plan-pack completion.

Current result:

```text
near_model_memory_plan_pack_incomplete
```

CM-2018 now supplies current Phase 1 command-gate evidence:

- `npm run test:all`
- `npm run gate:ci -- --json`

Report:

- `docs/near-model-memory-plan-pack/phase1_acceptance_gate_report.md`

Notable still-missing evidence categories include Phase 2 current native read
proof, Phase 8 native side-effect / rollback / failure proof, Phase 9
observation and external review, and Phase 10 external review / tag approval
packet evidence.

This audit performs no memory read, no raw private-state read, no native write,
no durable mutation, no provider/API call, no public MCP expansion, no tag, no
release, no deploy, no cutover, and no readiness claim.
