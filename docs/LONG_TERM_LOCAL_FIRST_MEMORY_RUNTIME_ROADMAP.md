# Long-Term Local-First Memory Runtime Roadmap

Status: LONG_TERM_ROADMAP_ACTIVE_NOT_READY
Date: 2026-05-23
Scope: reliability closure and governance closure for the long-term `codex-memory` objective

## Objective

Make `codex-memory` a default-usable, auditable, rollback-ready, governable, VCP-compatible, local-first memory runtime for Codex and Claude workflows.

This roadmap does not claim runtime readiness, RC readiness, production readiness, `memory recall reliable`, `memory write reliable`, V8 implementation, or VCP full parity. It is the execution map for the next two large phases.

## Current Ground Truth

- `RC_NOT_READY_BLOCKED` remains the controlling state.
- `memory recall reliable` remains bounded evidence only.
- `memory write reliable` remains exact-approval-only bounded evidence.
- Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.
- Provider calls, broad real memory scans, raw memory exposure, direct `.jsonl` reads, durable writes, rollback apply, migration/import/export/backup/restore apply, config/watchdog/startup changes, release/deploy/cutover, and readiness claims remain hard-gated unless separately exact-approved.
- PR #4 has merged the patched metadata-only recall boundary into `main`, but this roadmap does not by itself execute CM-0825 or close recall reliability.

## Phase 1: Reliability Closure

Goal: move from bounded evidence to controlled, reviewable live evidence for recall and write reliability without overclaiming readiness.

### 1. Recall Reliability Track

Current state:

- Fixture, temp workspace, limited local real-path, internal runner, executor adapter, precision hardening, and patched metadata-only path evidence exist.
- Post-hardening negative-control evidence has downgraded one narrow blocker.
- Broader recall reliability is still unproven.

Required closure ladder:

1. Reconcile mainline state after PR #4 so the truth table reflects that the patched metadata-only path is now on `main`.
2. Re-run targeted metadata-only recall boundary tests from current `main`.
3. Only with separate exact approval, execute the patched true live recall proof using the approved internal path, exact query count, sanitized output, complete zero side-effect counters, and no raw memory output.
4. Review actual proof evidence before changing blocker status.
5. Expand recall-quality evidence beyond one proof shape: expected-result coverage, irrelevant suppression, freshness/folder behavior, negative-control suppression, malformed metadata fail-closed behavior, and regression coverage.
6. Keep `memory recall reliable` unclaimed until the evidence covers both safety boundaries and practical recall-quality behavior for the intended local runtime scope.

Non-goals:

- No true live `search_memory` without exact approval.
- No raw memory content output.
- No broad real memory scan.
- No provider-backed proof by default.
- No reliability or readiness claim from a single proof shape.

### 2. Write Reliability Track

Current state:

- Existing write evidence is exact-approval-only.
- One rejected attempt and one repaired accepted write are useful evidence, but not default write reliability.

Required closure ladder:

1. Define a write reliability proof matrix covering validation, rejection, accepted sanitized write, audit, shadow store projection, vector/cache behavior, rollback/cleanup posture, idempotence, and failure handling.
2. Use fixture and temp-local write proof before any real durable write.
3. Only with separate exact approval, execute bounded sanitized write proof against the allowed local runtime surface.
4. Review durable memory/audit side effects and cleanup/rollback boundaries.
5. Prove no-token mutation rejection remains separate from authorized write reliability.
6. Keep `memory write reliable` unclaimed until repeated controlled evidence covers accepted write, rejected write, side-effect accounting, rollback posture, and stale/bad-memory prevention.

Non-goals:

- No default unattended `record_memory` reliability claim.
- No broad memory write.
- No migration/import/export/backup apply as part of write proof.
- No production readiness claim from bounded write evidence.

### Phase 1 Exit Criteria

Phase 1 can close only when:

- Recall reliability has reviewed controlled live evidence plus bounded regression evidence across expected, irrelevant, freshness/folder, timeout/error, raw-output, and side-effect boundaries.
- Write reliability has reviewed controlled write evidence plus rejection, audit, projection, idempotence, and rollback/cleanup posture.
- The truth table can mark the relevant reliability rows with stronger evidence without hiding residual hard stops.
- `RC_NOT_READY_BLOCKED` may still remain if governance, rollback apply, migration/apply, ValidationAggregator, VCP parity, or release gates remain open.

## Phase 2: Governance Closure

Goal: prevent bad memory from becoming durable recall pollution by making memory lifecycle and scope governable.

### 1. Memory Lifecycle Track

Required capabilities:

- proposal
- approval
- supersession
- tombstone
- forget / exclusion flow
- stale-memory detection
- bad-memory quarantine
- audit trail for lifecycle transitions
- read policy that keeps inactive or unsafe records out of recall by default

Execution ladder:

1. Fixture-first lifecycle contract review.
2. SQLite/shadow-store dry-run lifecycle shape.
3. Runtime read-policy proof in temp/local bounded state.
4. Controlled lifecycle transition proof with sanitized records.
5. Governance review surface that can explain why a record is active, inactive, superseded, tombstoned, or excluded from recall.

### 2. Scope Track

Required capabilities:

- user scope
- project scope
- agent scope
- task scope
- client scope
- workspace scope
- folder / LightMemo directory semantics
- donor-compatible scope behavior where relevant

Execution ladder:

1. Fixture-first scope rules and conflict cases.
2. Temp workspace scope recall evidence.
3. Limited local real-path scope recall evidence.
4. Read-policy evidence showing out-of-scope memory is suppressed.
5. Dashboard/governance surfaces showing scope state without exposing raw private content.

### 3. Pollution Prevention Track

Required capabilities:

- negative-control recall gates
- rejected-memory isolation
- tombstoned/superseded-memory isolation
- stale memory flags
- lifecycle-aware candidate generation
- reviewable audit for why a record entered or left recall

Execution ladder:

1. Expand bounded negative-control and isolation regression tests.
2. Bind lifecycle/scope filters into recall pipeline evidence.
3. Add review surfaces for stale, superseded, tombstoned, and rejected records.
4. Prove the surfaces do not leak raw content and do not mutate runtime state.

### Phase 2 Exit Criteria

Phase 2 can close only when:

- Proposal / approval / supersession / tombstone / forget flows are implemented or explicitly marked as still-open with proof gaps.
- User/project/agent/task/client/workspace scope behavior is enforced in recall, not just documented.
- Bad, stale, out-of-scope, rejected, tombstoned, or superseded memory cannot silently pollute normal recall.
- Governance evidence is auditable without broad raw memory exposure.
- The truth table can distinguish implemented governance runtime behavior from fixture-only or docs-only surfaces.

## Ordering Rule

The next safest large-phase order is:

1. Reliability closure mainline reconciliation and recall proof path review.
2. Recall reliability controlled evidence.
3. Write reliability proof matrix and bounded write evidence.
4. Governance lifecycle runtime closure.
5. Scope and pollution-prevention runtime closure.
6. VCP parity hardening after the runtime spine is trustworthy.

Do not expand governance/autopilot documentation surfaces as a substitute for runtime reliability evidence.

## No-Overclaim Rule

Use these labels until stronger evidence exists:

- `memory recall reliable: not claimed`
- `memory write reliable: not claimed`
- `runtime ready: not claimed`
- `RC ready: not claimed`
- `production ready: not claimed`
- `V8 implemented: no`
- `VCP full parity: not claimed`

This roadmap is complete as a planning artifact only. The objective remains active until the runtime itself satisfies the reliability and governance closure criteria.
