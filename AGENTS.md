# AGENTS.md — codex-memory Sustained Autopilot v1.0

Purpose: project-specific operating constitution for Codex/agents working inside the existing `codex-memory` repository.

Default mode: `A4-Sustained Local Autopilot`.

This file adapts the universal sustained local autopilot pattern to the real `codex-memory` project. It is not a blank-project scaffold. It is a continuation rail for an existing, mature `vcp_codex_memory` runtime.

This file is the project constitution, not the live project journal. Keep durable operating rules here. Put volatile phase status, current commit facts, temporary blockers, active task state, approval packets, and handoff details in `STATUS.md`, `.agent_board`, or dedicated docs.

---

## 0. Plain Meaning

`codex-memory` is already alive.

It is not waiting for a skeleton.

It already has HTTP/stdio MCP entrypoints, the `vcp_codex_memory` service contract, `record_memory` / `search_memory` / `memory_overview`, diary-compatible writes, SQLite shadow store, vector indexing, write/recall audit, active-memory compatibility, `DeepMemo` / `TopicMemo`, provider/profile tooling, compare/rollback harnesses, and mainline gates.

Codex should continue this project by:

1. Reading the real README and source behavior.
2. Inspecting workspace state.
3. Maintaining `.agent_board`.
4. Decomposing clear goals into task queues.
5. Making small local verified changes.
6. Running the correct project-specific validation gate.
7. Updating checkpoints.
8. Creating guarded local commits only when strict conditions are met.
9. Continuing until complete or hard-stopped.

Do not replace the real README with generic vision.

Do not redraw the four-layer architecture without evidence.

Do not bypass the gates.

Do not push unless the user explicitly authorizes it or the A4.8 safe-push policy applies and readiness is ready.

If the A4.8 safe-push policy does not fully pass, or if push readiness is uncertain, stale, contradicted by repository reality, or missing required evidence, stop before push and report the blocker.

---

## 1. Language Policy

Default response language: Simplified Chinese.

Keep the following in original language unless the user explicitly asks for translation:

- code
- commands
- file paths
- API names
- package names
- branch names
- commit hashes
- config keys
- environment variable names
- logs
- errors
- CLI output
- tool names
- test names

Reports should be direct, compact, and evidence-first.

---

## 2. Project Current Reality

The repository is an independent `vcp_codex_memory` implementation whose purpose is to let Codex memory write, retrieval, audit, and recall enhancement no longer depend on the `VCPToolBox` runtime.

Current protected realities include:

- MCP service name: `vcp_codex_memory`
- public tools:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- HTTP MCP and stdio MCP entrypoints
- default recommendation: HTTP MCP for Codex Desktop stability
- diary-compatible write path
- parallel write path into SQLite shadow store, vector index, and audit logs
- chunk index and candidate cache
- write audit and recall audit
- `Time` / `Group` / `Rerank` / `TagMemo` / dedup / rerank
- `LightMemo` directory strategy
- embedding provider adapter
- embedding fallback chain: `bge-m3-local -> NVIDIA baai/bge-m3 -> local-hash`
- rerank provider adapter
- Phase C active memory
- `DeepMemo` / `TopicMemo` donor-compatible behavior
- compare and rollback harnesses
- Phase D gray rollout records
- Phase E hardening, diagnostics, standard suite, ordering tie-breaker work
- default mainline gate
- HTTP observe CLI
- rollback mainline plan CLI
- provider smoke / benchmark
- profile health / profile gate
- V8 diagnostic CLI

Do not treat these as future features unless source proves otherwise.

---

## 3. Project Final Goal

Final goal:

`codex-memory` should become the default Codex- and Claude-oriented VCP memory mainline: local-first, auditable, rollback-ready, provider-flexible, VCP-compatible, and safe for sustained Codex/Claude workflows.

This means hardening the existing runtime into a long-term memory spine for:

- Codex
- Claude
- VCP-compatible donor behavior and migration references

The goal is not to restart the project.

The goal is to continue from existing Phase C/D/E work toward full VCP memory parity and stronger governance.

---

## 4. Final Capability Target

The final capability target is a map, not the current task queue.

Codex must not attempt to implement all final capabilities at once.

Current work must be selected from the user request, repository docs, `STATUS.md`, `PHASE_NAVIGATION.md`, `PHASE_E_BACKLOG.md`, source reality, or `.agent_board`.

### 4.1 Current Implemented Capabilities to Protect

Protect and preserve:

- `vcp_codex_memory` MCP service identity
- HTTP MCP default mainline
- stdio MCP debug path
- `record_memory`
- `search_memory`
- `memory_overview`
- diary compatibility
- SQLite shadow store
- vector index
- write audit
- recall audit
- candidate cache
- active-memory index
- DeepMemo CLI
- TopicMemo CLI
- compare harness
- rollback readiness harness
- mainline gate
- HTTP observe
- rollback plan
- provider smoke
- provider benchmark
- profile health
- profile gate
- embedding profile fingerprint behavior
- LightMemo directory semantics
- donor-style errors and diagnostics
- standard suite fixtures and manifests

### 4.2 Protected Compatibility Capabilities

Changing these is high risk:

- MCP tool contract
- donor-style `DeepMemo` envelope and result semantics
- donor-style `TopicMemo` envelope and result semantics
- donor-style error messages and diagnostics
- error `meta` placement
- blocked/effective keyword semantics
- advanced query syntax behavior
- `maid` / `folder` / excluded folders / directory alias behavior
- topic ordering tie-breakers
- active-memory standard suite behavior
- rollback readiness criteria
- HTTP MCP 7605 default mainline
- legacy 6005 rollback target discovery and verification
- embedding profile fingerprint and migration safety

### 4.3 Final VCP Memory Parity Capabilities

Long-term direction:

- VCP passive memory parity
- VCP active memory parity
- DeepMemo / TopicMemo high compatibility
- TagMemo semantic association hardening
- EPA and ResidualPyramid recall-chain hardening
- LightMemo directory semantics stability
- recall quality evaluation
- memory compaction
- stale memory detection
- supersession / tombstone / forget flow
- memory proposal / approval flow
- Codex/Claude client-scoped memory proposal and approval flow
- project/user/agent/task/checkpoint/handoff memory layering
- safe import/export/migration chain
- profile migration quality gate
- provider fallback quality benchmark
- observability/admin review surface
- safe integration with Codex and Claude MCP clients; VCPToolBox remains donor/reference only

### 4.4 Next Strategic Direction

Reasonable next-phase labels:

```text
Phase F — VCP full-memory parity hardening
Phase G — memory governance / proposal / supersession / tombstone
Phase H — Codex/Claude client governance and memory scoping
Phase I — observability / admin review surface
```

These labels are strategic direction, not automatic authorization.

---

## 5. Authority Order

When instructions conflict, follow this order:

1. Safety and hard stop gates.
2. Current explicit user instruction.
3. Current repository state and observed command output.
4. Current source behavior.
5. Existing README and tracked phase docs.
6. Closest project `AGENTS.md`.
7. `.agent_board` current state.
8. Other checked-in docs.
9. Global Codex guidance.
10. Memory or previous summaries.
11. General model knowledge.

Source behavior and command output outrank old memory and old checkpoints.

If README and source disagree, inspect tests/source and report drift.

---

## 6. Existing Architecture Is Binding

The current repository is organized around four primary layers:

```text
src/core/      unified memory domain services and flows
src/storage/   diary, SQLite, vector index, chat index, audit, cache
src/recall/    candidate generation, TagMemo, EPA, ResidualPyramid, rerank, audit
src/adapters/  Codex MCP, VCP passive memory, VCP active memory compatibility
```

Main entrypoint families include:

```text
src/app.js
src/index.js
src/http-index.js
src/cli/rebuild-shadow.js
src/cli/active-memory.js
src/cli/deepmemo.js
src/cli/topicmemo.js
src/cli/compare-vcp-active-memory.js
src/cli/rollback-active-memory.js
src/cli/mainline-gate.js
src/cli/http-observe.js
src/cli/mainline-rollback.js
src/cli/provider-smoke.js
src/cli/provider-benchmark.js
src/cli/rebuild-profile.js
src/cli/cleanup-legacy-chunks.js
src/cli/profile-health.js
src/cli/shadow-compare.js
src/cli/profile-gate.js
src/cli/v8-diagnose.js
```

Do not replace this with a speculative new architecture.

New code should fit the existing four-layer map unless source evidence and user instruction justify otherwise.

---

## 7. Default Autonomy: A4-Sustained Local Autopilot

Default mode:

```text
A4-Sustained Local Autopilot
```

Meaning:

Codex may perform long-running local work when the goal is clear and the work remains:

- local
- inside workspace root for writes
- reversible
- non-destructive
- non-production
- non-secret-bearing
- not dependency-changing
- not remote-writing
- not overwriting user-owned work
- compatible with existing gates

Codex should not stop for ordinary implementation details.

Codex should stop only for hard stops, unsafe state, unclear goal that cannot be safely narrowed, or validation/design failure requiring human decision.

### 7.1 A4.8 Safe Project Operator Rail

When explicitly activated, `A4.8 Safe Project Operator Rail` lets Codex select the next safe local phase from the roadmap/backlog/board, split work into planning / fixture / dry-run / runtime / gate / observability subphases, run validation selection automatically, create guarded commits, run push readiness, and safe-push only when the safe-push policy fully passes.

Fail-closed rule: if any safe-push requirement is unmet, unknown, stale, contradicted by Git state, blocked by A5 hard stops, or missing evidence, Codex must stop before push. Push-readiness checks are allowed under A4.8; actual push is allowed only when the safe-push policy applies completely or the user gives explicit push authorization.

Reference docs:

- [SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md](/A:/codex-memory/docs/SUPREME_COMMANDER_AUTOPILOT_PROTOCOL.md)
- [A4_8_SAFE_PROJECT_OPERATOR_RAIL.md](/A:/codex-memory/docs/A4_8_SAFE_PROJECT_OPERATOR_RAIL.md)
- [SAFE_PUSH_POLICY.md](/A:/codex-memory/docs/SAFE_PUSH_POLICY.md)
- [VALIDATION_SELECTION_MATRIX.md](/A:/codex-memory/docs/VALIDATION_SELECTION_MATRIX.md)
- [AUTOPILOT_FAILURE_RECOVERY.md](/A:/codex-memory/docs/AUTOPILOT_FAILURE_RECOVERY.md)

A4.8 is not unlimited permission. Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview` unless a dedicated approved phase explicitly authorizes expansion. A5 hard stops remain manual, including real DB/memory mutation, SQLite migration, MCP public tool/schema expansion, provider calls, dependency changes, secrets/env edits, release/tag/deploy, destructive commands, and stale branch merge/rebase/cherry-pick.

### 7.1.1 AGENTS v0.3.1 Compatibility Boundary

AGENTS v0.3.1 concepts may be used selectively as wording and review aids. They do not replace this project `AGENTS.md`, weaken codex-memory gates, or change current status vocabulary.

Current repository profile is `Standard`: `AGENTS.md` plus `.agent_board/`.

Current BHA state is `BHA_ABSENT`: no `.bha/`, no `scripts/bha-run.js`, and no `scripts/bha-verify.js`.

Therefore, Codex must not claim BHA-backed runtime proof, BHA-enforced closeout, or BHA authorization in this repository unless BHA runtime surfaces are later added and verified against current repository reality.

---

## 7.2 Push Authority Rule

Push is allowed only through one of two routes:

1. The user explicitly authorizes the exact push action.
2. `A4.8 Safe Project Operator Rail` is explicitly active and the safe-push policy fully passes.

Safe-push requires fresh repository reality, current validation evidence, clean scope, no unresolved A5 hard stop for the push target, no secret/dependency/config/runtime-data surprise, and no stale branch or remote ambiguity.

If any push requirement is unmet, unknown, stale, contradicted by Git state, or missing evidence, Codex must stop before push and report the blocker. Push-readiness checks may continue locally; actual push must not occur.

---

## 8. `.agent_board` Persistent Track

Codex must maintain `.agent_board` at repository root for sustained work.

Required files:

```text
.agent_board/TASK_QUEUE.md
.agent_board/CHECKPOINT.md
.agent_board/RUN_STATE.md
.agent_board/HANDOFF.md
.agent_board/BLOCKERS.md
.agent_board/DECISIONS.md
.agent_board/FILE_LOCKS.md
.agent_board/RISK_REGISTER.md
.agent_board/VALIDATION_LOG.md
```

`.agent_board` should track codex-memory-specific state:

- current area
- affected subsystem
- required validation
- last gate result
- MCP mode assumption
- HTTP health
- compare result
- rollback result
- profile gate result
- audit impact
- recall impact
- guarded auto-commit eligibility

`.agent_board` is the rail.

Repository reality is the ground.

---

## 9. Work Categories

Use these area labels in `.agent_board/TASK_QUEUE.md`:

```text
P0-mainline-health
P1-donor-compatibility
P2-active-memory
P3-provider-profile
P4-http-runtime
P5-rollback-readiness
P6-docs-drift
P7-vcp-parity-hardening
P8-memory-governance
P9-codex-claude-client-scope
P10-observability-admin
```

Each task should include:

- task id
- phase/area
- target files
- risk
- status
- required validation
- rollback check
- gate requirement
- notes

---

## 10. Initialization Loop

At the beginning of non-trivial repository work, implementation work, validation work, branch-sensitive work, rollback-sensitive work, migration-sensitive work, release-like work, or commit/push work:

1. Inspect Git state.
2. Read `README.md`.
3. Read `STATUS.md` if present.
4. Read `PHASE_NAVIGATION.md` if present.
5. Read `PHASE_E_BACKLOG.md` if present.
6. Read existing `.agent_board`.
7. Resolve stale board state against repository reality.
8. Decompose the goal into queue items.
9. Select one `in_progress` item.
10. Begin safe local execution.

For small read-only questions, narrow reviews, typo-level docs edits, or targeted single-file checks, use targeted inspection instead of the full initialization loop. Still inspect Git state before editing, validation, commit, push-readiness, or any action that could affect user-owned work.

Required Git checks:

```bash
git branch --show-current
git status --short
git diff --stat
```

For branch-sensitive, rollback-sensitive, migration-sensitive, release-like, or commit work:

```bash
git log --oneline --decorate -n 10
```

### 10.1 Startup Fact Capsule

For non-trivial repository work, report these startup facts when they materially affect scope, risk, validation, handoff, or push-readiness:

- active profile: `Standard` unless BHA runtime surfaces are present and verified
- BHA state: `BHA_ABSENT` unless BHA runtime surfaces are present and verified
- current autonomy rail: A4 / A4.8 codex-memory rails
- branch and worktree state
- current goal source
- next safe local task

This capsule is an orientation aid only. It does not weaken hard stops, validation gates, project-specific status vocabulary, or `NOT_READY_BLOCKED`.

---

## 11. Sustained Execution Loop

Continue until done or hard-stopped:

1. Select next highest-priority safe task.
2. Confirm affected subsystem.
3. Inspect source/tests/docs.
4. Make the smallest useful change.
5. Inspect diff.
6. Run targeted validation.
7. Run gate-level validation if subsystem requires it.
8. If validation passes, mark task `done`.
9. If validation fails and fix is obvious, attempt one narrow fix.
10. Rerun validation.
11. If still failing, mark `blocked`.
12. Update `.agent_board`.
13. Create checkpoint.
14. Consider Guarded Auto-Commit.
15. Continue to next safe task.

Do not batch unrelated changes.

Do not bypass validation because the change "looks small."

---

## 12. Validation Contract

Validation is part of completion.

Use result labels:

```text
COMPLETED_VALIDATED
COMPLETED_UNVALIDATED
PARTIAL
BLOCKED
FAILED
```

Do not say tests passed if they were not run.

Do not claim full validation if only targeted validation ran.

If validation is unavailable, state why.

### 12.1 Dry-Run Acceptance Wording

Use precise acceptance wording:

- `docs-only`: documentation or board state only
- `fixture-only`: synthetic fixtures only, no real memory or runtime store
- `no-mutation`: inspected or executed path produced no intended mutation
- `read-only`: no write path, no service or config mutation, no durable state change
- `live-runtime`: actual runtime or service evidence, never implied by docs-only or fixture-only work

Do not treat docs-only, fixture-only, no-mutation, or read-only proof as runtime readiness, cutover readiness, production readiness, or `RC_READY`.

---

## 13. Codex-Memory Validation Matrix

### 13.1 Docs-only Change

Minimum:

```text
inspect diff
verify no contradiction with README/source reality
verify no secret exposure
```

If docs mention commands, verify they exist in `package.json` where possible.

### 13.2 Generic Source Change

Minimum:

```bash
npm test
```

If a narrower relevant test exists, run it first.

### 13.3 MCP Tool or Contract Change

Run targeted tests, then:

```bash
npm run gate:mainline:strict
```

If HTTP runtime behavior is involved:

```bash
npm run start:http:ensure
npm run observe:http -- --json
```

### 13.4 HTTP MCP Startup / Watchdog / Self-Healing Change

Use:

```bash
npm run start:http:ensure
npm run observe:http -- --json
npm run start:http:watchdog:once
npm run gate:mainline
```

Installing or modifying startup/watchdog tasks requires explicit approval.

### 13.5 Active Memory / DeepMemo / TopicMemo Change

Use:

```bash
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

For broad/mainline-sensitive changes:

```bash
npm run gate:mainline:strict
```

### 13.6 Ordering / Tie-Breaker Change

Use targeted ordering validation:

```bash
node --test .\tests\phase-c-active-recall.test.js
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-ready
```

Then run broader validation if shared recall code is touched.

### 13.7 Recall Main Chain / TagMemo / EPA / ResidualPyramid / Rerank Change

Use:

```bash
npm test
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run gate:mainline
```

If MCP/HTTP contract is touched:

```bash
npm run gate:mainline:strict
```

### 13.8 LightMemo Directory Strategy Change

Validate:

- `maid`
- `folder`
- `maid AND (folder1 OR folder2)`
- `search_all_knowledge_bases=true`
- excluded folders
- directory alias map

Run targeted tests plus standard suite compare/rollback.

### 13.9 Provider / Embedding / Rerank Change

Never expose provider keys.

Use only when task is provider-related:

```bash
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
```

Provider calls may use external configured services. Do not run them casually for unrelated work.

### 13.10 Embedding Profile / Fingerprint / Profile Migration Change

Default to dry-run only:

```bash
npm run rebuild-profile -- --dry-run --json
npm run profile-health
npm run shadow-compare -- --query "embedding profile migration"
npm run profile-gate -- --json --summary-only
```

Do not run:

```bash
npm run rebuild-profile -- --confirm --json
```

unless explicitly approved.

### 13.11 Shadow Store / Diary / Vector Index / Candidate Cache Change

Prefer fixture tests.

Be cautious with:

```bash
npm run rebuild-shadow
```

Real shadow/index rebuild can affect local durable state. Run it only when user intent clearly authorizes maintenance or validation requires it and risk is understood.

### 13.12 Cleanup / Legacy Chunk Change

Dry-run only by default:

```bash
npm run cleanup-legacy-chunks -- --dry-run --json
```

No apply/confirm cleanup without explicit approval.

### 13.13 Rollback Planning Change

Read-only planning is allowed:

```bash
npm run rollback:mainline:plan -- --json
```

Do not apply generated config patches automatically.

### 13.14 CI / Workflow Change

High risk.

Run local equivalent validation first.

Do not push workflow changes without explicit approval.

---

## 14. Local Validation Scripts

If present, prefer project-specific local validation scripts:

```text
scripts/validate-local.ps1
scripts/validate-local.sh
```

These scripts must remain local and safe.

They must not:

- push
- deploy
- edit secrets
- edit `.env`
- install dependencies
- change provider keys
- write production state
- run destructive cleanup
- write outside workspace root
- run profile confirm/apply
- change Codex config

If a validation script appears unsafe, stop and report.

---

## 15. Guarded Auto-Commit

Local commit is allowed under strict guard.

Push is never automatic.

### 15.1 Conditions

All must be true:

1. User goal authorized local sustained implementation.
2. Current task/stage is complete.
3. Required codex-memory validation passed, or missing validation is documented.
4. `.agent_board` is updated.
5. Diff was inspected.
6. Only intended files inside workspace root changed.
7. No secrets in diff.
8. No `.env` or secret file changed.
9. No dependency manifest/lockfile changed unless explicitly approved.
10. No real migration, profile confirm, cleanup apply, or config switch occurred.
11. No watchdog/scheduled task/HKCU Run modification occurred.
12. No user-owned uncommitted changes are included.
13. Commit is coherent and related.
14. Worktree state is understood immediately before commit.

If uncertain, do not commit.

### 15.2 Procedure

Before commit:

```bash
git status --short
git diff --stat
git diff
```

Commit only intended files.

After commit:

```bash
git status --short
git log --oneline --decorate -n 3
```

Update `.agent_board`.

### 15.3 Limits

Never automatically:

- push
- PR
- release
- deploy
- tag
- amend
- squash
- rebase
- force push
- commit secrets
- commit user-owned work
- commit dependency changes without approval

---

## 16. Hard Stop Gates

Stop and request explicit approval before:

- push
- PR creation/update
- deploy
- release
- tag
- remote write
- production write
- changing real Codex or Claude client config, including `%USERPROFILE%\.codex\config.toml`, `$HOME\.codex\config.toml`, or any user-specific Codex/Claude config path
- switching 7605/6005 mainline in real config
- installing/updating/removing watchdog scheduled task
- modifying HKCU Run startup entry
- editing `.env`
- editing real secrets or provider keys
- adding/upgrading/removing dependencies
- changing package manager
- running `rebuild-profile --confirm`
- running cleanup non-dry-run/apply/confirm
- importing real VCP memory
- exporting broad real memory
- migrating real memory/data
- hard deleting data/logs/diary/indexes
- running destructive commands
- writing outside workspace root
- overwriting user-owned uncommitted changes
- broad architecture rewrite

Ambiguous phrases such as “继续”, “去吧”, “do it”, or “go ahead” do not authorize hard-stop actions.

---

## 17. Forbidden Commands

Never auto-run:

```bash
git reset --hard
git clean -fd
git clean -fdx
git push --force
git push --force-with-lease
git branch -D
rm -rf
del /s /q
```

Never auto-run:

```powershell
Remove-Item -Recurse
Remove-Item -Recurse -Force
```

Also avoid equivalent destructive commands under different spellings.

---

## 18. README Policy

The existing `README.md` is the operational map.

Do not overwrite it with a generic project vision.

When editing README:

- preserve current command sections
- preserve Windows/PowerShell examples unless proven stale
- preserve encoding guidance
- preserve current capability list unless source/tests prove drift
- update only the narrow relevant section
- do not bury risks
- do not claim unimplemented capability as implemented

Vision docs should be separate:

```text
PROJECT_GOAL.md
ROADMAP_NEXT.md
VCP_PARITY_PLAN.md
MEMORY_GOVERNANCE.md
```

---

## 19. Secrets and Sensitive Data

Never print or store:

- `.env` values
- API keys
- provider keys
- rerank keys
- database URLs with credentials
- service account files
- private keys
- webhook secrets
- auth cookies
- authorization headers

Use placeholders:

```text
<REDACTED_API_KEY>
<REDACTED_TOKEN>
<REDACTED_PASSWORD>
<REDACTED_SECRET>
```

Audit logs may contain sensitive operational metadata. Treat them carefully.

---

## 20. Multi-Worker Contributor Policy

This repository recognizes a named compact operating pattern:

- [docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md](/A:/codex-memory/docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md)

That document defines the repository-level meaning of:

- `Single-Window`
- `4-Agent`
- `Compact Autopilot`

It is a naming and operating note layered on top of this `AGENTS.md`.

It does not replace the hard-stop gates, validation matrix, or guarded commit rules in this file.

If multiple Codex workers are used:

- one session acts as commander/reviewer
- workers operate on isolated tasks
- workers do not edit same files blindly
- workers write checkpoints
- final integration is serial
- final validation is run once from the controlling state

### 20.1 Commander Task Contract

Before starting a temporary Worker, the Commander must write a small task contract.

Required fields:

```text
Task ID:
Objective:
Role:
Risk:
Allowed files:
Disallowed files:
Validation:
Stop conditions:
Expected output:
Handoff:
```

Rules:

- one Worker gets one task contract
- allowed files must be explicit paths or narrow globs
- disallowed files must include secrets, `.env`, dependency manifests, runtime data, and unrelated modules
- validation must name concrete commands or explicitly say docs/diff-only
- stop conditions must include unexpected dirty worktree, user-owned changes, hard-stop gates, validation ambiguity, and scope expansion
- the Worker must not broaden the task without Commander approval
- the Worker must update only the files named in the contract, unless the contract explicitly allows `.agent_board` handoff updates
- if the task needs a file already locked in `.agent_board/FILE_LOCKS.md`, the Worker must stop

### 20.2 Read-Only Verifier Protocol

A Verifier is read-only.

The Verifier must not:

- edit files
- stage files
- commit
- push
- tag
- run destructive commands
- run provider calls
- change config
- start long-running services
- write outside the workspace

The Verifier should inspect:

```text
git status --short
git diff --stat
git diff
.agent_board/RUN_STATE.md
.agent_board/TASK_QUEUE.md
.agent_board/VALIDATION_LOG.md
.agent_board/FILE_LOCKS.md
.agent_board/RISK_REGISTER.md
```

Verifier checklist:

- changed files are inside the task contract
- no disallowed files changed
- no `.env`, secret, dependency manifest, lockfile, generated durable data, or runtime config changed unless explicitly approved
- validation evidence matches the risk level
- hard-stop gates were respected
- file locks were honored
- `.agent_board` state is current enough for handoff
- commit readiness is either `eligible`, `not eligible`, or `blocked`

Verifier output:

```text
Result: PASS | NEEDS_FIX | BLOCKED
Scope:
Validation:
Hard stops:
Secrets/dependencies:
Board state:
Commit readiness:
Required fixes:
```

For future Codex/Claude memory-governance work:

- workers may create memory proposals
- durable memory changes must pass policy/gate
- policy review approves proposals
- final write/audit path remains controlled

---

## 21. Dependency Policy

Dependency changes are hard stop.

Do not automatically:

- add dependency
- remove dependency
- upgrade dependency
- downgrade dependency
- change package manager
- intentionally change lockfile

Allowed only for local validation setup when safe:

```bash
npm ci
```

Only if current project manifests already support it and it does not intentionally change manifests/lockfiles.

If a lockfile changes unexpectedly, stop.

---

## 22. User-Owned Work Protection

Treat pre-existing uncommitted changes as user-owned.

Before editing:

- inspect file status
- inspect nearby diff if modified
- avoid unrelated lines
- do not stage user-owned changes
- do not commit user-owned changes

If conflict risk exists, stop and report.

---

## 23. Handoff Policy

For non-trivial work, update `.agent_board/HANDOFF.md`.

Include:

```text
Goal:
Workspace:
Branch:
Worktree:
Current area:
Changed files:
Validation:
Not validated:
MCP mode:
HTTP health:
Compare:
Rollback:
Profile gate:
Audit impact:
Recall impact:
Remaining risks:
Next safe step:
```

Resume by verifying repository reality. Do not trust stale handoff blindly.

---

## 24. Reporting Format

For repository work:

```text
Workspace:
Mode:
Risk:
Branch:
Worktree:
Area:
Changed:
Validated:
Not validated:
Committed:
Result:
Remaining risk:
Next:
```

For runtime/MCP work add:

```text
MCP mode:
Health:
Gate:
Compare:
Rollback:
Audit:
```

For provider/profile work add:

```text
Provider:
Profile:
Smoke:
Benchmark:
Profile gate:
Secrets:
```

For blocked work:

```text
Blocked:
Reason:
Hard stop:
Required approval/action:
Safe state:
Next after approval:
```

Whenever a report includes `Next:`, `Next safe step:`, `Next safe action:`, or `Next after approval:`, include one concise Simplified Chinese sentence explaining why that is the next safe action.

### 24.1 Optional Profile-Aware Closeout

When profile or BHA state is relevant, include:

```text
Profile:
BHA state:
Mode:
Evidence:
Validation:
Skipped:
Blocked:
Risk:
Next:
```

If BHA is absent, write `BHA state: BHA_ABSENT`.

This is reporting structure only, not BHA runtime proof.

---

## 25. Final Rule

This repository already has bones, blood, and memory.

Do not rebuild it as a toy skeleton.

Keep the current contracts.

Use the existing gates.

Move in small verified steps.

Commit locally only when guarded.

Never push outside explicit user authorization or the A4.8 safe-push policy. If the A4.8 safe-push policy does not fully apply, stop before push.

The goal is not more motion.

The goal is trustworthy sustained motion.
