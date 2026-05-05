# AGENTS.md — codex-memory 项目级执行宪法

Purpose: guide Codex/agents working inside the existing `codex-memory` repository.

Project status: this is not a blank project. It is an already-running independent `vcp_codex_memory` implementation with HTTP/stdio MCP entrypoints, diary-compatible writes, SQLite shadow store, vector index, write/recall audit, active memory, DeepMemo/TopicMemo compatibility, provider profiles, compare/rollback harnesses, and Phase E gate workflows.

This file defines how agents should continue work safely without overwriting the real project map.

---

## 0. Plain Meaning

`codex-memory` is an existing memory runtime.

Do not treat it as a new skeleton.

Do not replace the existing README with a generic project vision.

Do not redraw the architecture unless the current source proves the architecture changed.

The job of an agent in this repository is:

- inspect reality
- preserve existing contracts
- make small verified improvements
- protect diary / SQLite / vector / audit data
- keep HTTP MCP stable
- keep donor-compatible active-memory behavior stable
- validate through the existing test and gate system
- report what was and was not verified

Short rule:

- source behavior is ground
- README is the runtime map
- tests and gates are proof
- memory is context, not authority
- rollback readiness is part of safety

---

## 1. Current Repository Reality

The current README states that `codex-memory` is an independent `vcp_codex_memory` repository implementation. Its purpose is to let Codex memory write, retrieval, audit, and recall enhancement no longer depend on the `VCPToolBox` runtime.

The current implementation preserves:

- MCP service name: `vcp_codex_memory`
- tool contracts:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- diary-compatible write path
- parallel writes to:
  - diary
  - SQLite shadow store
  - vector index
  - audit logs
- default recommendation: HTTP MCP for Codex Desktop stability
- optional stdio MCP entrypoint
- active-memory compatibility for donor-style `DeepMemo` and `TopicMemo`
- compare / rollback harnesses
- Phase D/E migration, gray rollout, standard suite, profile gate, and mainline gate workflows

Agents must preserve these facts unless current source and checked-in docs prove they are outdated.

---

## 2. Authority Order

When instructions conflict, follow this order:

1. Safety and hard stop gates.
2. Current explicit user instruction.
3. Current repository state and observed command output.
4. Current source behavior.
5. Existing project README and tracked phase docs.
6. Closest project `AGENTS.md`.
7. Other checked-in docs.
8. Global Codex guidance.
9. Memory or previous summaries.
10. General model knowledge.

Memory never outranks repository reality.

README does not override source behavior, but README is the first project map for existing workflows.

If docs and source disagree, inspect source and tests, then report the drift plainly.

---

## 3. Existing Architecture Must Be Preserved

The repository is organized around four primary layers:

```text
src/core/      unified memory domain services and flows
src/storage/   diary, SQLite, vector index, chat index, audit, cache
src/recall/    candidate generation, TagMemo, EPA, ResidualPyramid, rerank, audit
src/adapters/  Codex MCP, VCP passive memory, VCP active memory compatibility
```

Main entrypoints include:

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

Do not replace this with a speculative `src/memory`, `src/policy`, `src/mcp` rewrite.

New modules should fit the existing layout unless there is a verified reason to change it.

---

## 4. Non-Negotiable Compatibility Contracts

### 4.1 MCP Service Contract

Keep service name:

```text
vcp_codex_memory
```

Keep public tools unless explicitly asked and validated:

```text
record_memory
search_memory
memory_overview
```

Tool semantics to preserve:

- `record_memory` must respect Codex bridge constraints and write through the established diary / shadow / vector / audit path.
- `search_memory` must remain compatible with process / knowledge / both retrieval and `include_content`.
- `memory_overview` must return safe overview of write audit, recall audit, shadow/index health, and recent activity.

Any tool contract change is high risk.

### 4.2 HTTP MCP Default

HTTP MCP is the recommended default for Codex Desktop stability.

Default endpoint family:

```text
http://127.0.0.1:7605/health
http://127.0.0.1:7605/mcp/codex-memory
```

Do not switch default back to stdio unless explicitly requested and validated.

### 4.3 Legacy / Rollback Target

The README records a legacy donor target discovered around:

```text
http://127.0.0.1:6005/mcp/codex-memory
```

Do not assume it is always reachable.

Use the rollback planning CLI to verify current reality.

### 4.4 Donor Active-Memory Compatibility

DeepMemo / TopicMemo donor-style behavior is protected by compare and rollback harnesses.

Do not casually change:

- donor-style error envelopes
- `status/result` compatibility
- error diagnostics placement
- `meta` drift behavior
- blocked/effective keyword semantics
- `maid` / `folder` / alias semantics
- topic ordering tie-breakers
- invalid JSON behavior
- `agent-not-found`, `topic-not-found`, `empty-history`, `missing-history`, `history-read-error` behavior

Any change here requires targeted tests plus standard suite compare/rollback validation.

---

## 5. Default Autonomy

Default autonomy: `A2-Safe`.

Codex may automatically perform local, reversible, inside-scope work:

- inspect files
- inspect Git status
- search source and docs
- update documentation carefully
- make small focused source changes
- add or adjust targeted tests
- run existing local validation commands
- inspect diffs
- produce checkpoint reports

Codex must stop before:

- commits or pushes
- release, tag, deploy, or publish
- remote writes
- production changes
- editing `.env` or real secrets
- dependency changes without approval
- destructive commands
- real data migration
- profile rebuild confirm/apply
- cleanup confirm/apply
- changing Codex config
- changing Windows scheduled tasks or HKCU startup entries
- hard deletion of data, logs, diary, SQLite, vector index, or chat index
- broad architecture rewrite
- changes that may overwrite user-owned work

---

## 6. Workspace Reality Check

Before edits or validation, run or inspect equivalent state:

```bash
git branch --show-current
git status --short
git diff --stat
```

For branch-sensitive, rollback-sensitive, migration-sensitive, release-like, or remote-sensitive work, also inspect:

```bash
git log --oneline --decorate -n 10
```

Then inspect relevant project files before acting:

```text
README.md
STATUS.md
PHASE_NAVIGATION.md
MEMORY.md
PROJECT_CLOSURE.md
PHASE_E_BACKLOG.md
PHASE_E_SUMMARY.md
package.json
relevant tests
relevant source files
```

If any of these files are missing in the actual workspace, do not assume. Report what exists.

---

## 7. Documentation Policy

The existing README is operational documentation.

Do not replace it with a generic vision document.

When editing README:

- preserve operational command sections
- preserve Windows/PowerShell examples unless proven stale
- preserve UTF-8 / BOM compatibility guidance
- preserve existing local path conventions unless user asks otherwise
- preserve current capability lists unless source proves drift
- update only the narrow section relevant to the change
- avoid large unrelated rewrites

If a high-level vision is needed, create or update a separate doc such as:

```text
PROJECT_GOAL.md
ARCHITECTURE_GOVERNANCE.md
ROADMAP_NEXT.md
MEMORY_GOVERNANCE.md
```

Do not let aspirational docs imply features are already implemented.

---

## 8. Validation Contract

A task is not complete until validation status is clear.

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

Do not treat successful reasoning as validation.

If validation fails:

1. Report the failure.
2. Attempt one narrow obvious fix if safe.
3. Rerun relevant validation.
4. Stop if the next fix requires broad design change.

---

## 9. Validation Matrix by Change Type

### 9.1 Docs-only Change

Minimum:

```text
inspect diff
verify no contradiction with README/source reality
verify no secret exposure
```

If docs mention commands, verify commands exist in `package.json` when possible.

### 9.2 Generic Source Change

Minimum:

```bash
npm test
```

If a narrower relevant test exists, run it first, then decide if broader validation is needed.

### 9.3 MCP Tool or Contract Change

Run targeted tests when available, then:

```bash
npm run gate:mainline:strict
```

If HTTP runtime behavior is involved:

```bash
npm run start:http:ensure
npm run observe:http -- --json
```

Do not claim MCP stability without contract or runtime validation.

### 9.4 HTTP MCP Startup / Watchdog / Self-Healing Change

Use:

```bash
npm run start:http:ensure
npm run observe:http -- --json
npm run start:http:watchdog:once
npm run gate:mainline
```

Be careful: install-task / install-watchdog touches user startup state and requires explicit approval.

### 9.5 Active Memory / DeepMemo / TopicMemo Change

Use targeted tests when relevant, then:

```bash
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

If the change is broad or mainline-sensitive:

```bash
npm run gate:mainline:strict
```

### 9.6 Ordering / Tie-Breaker Change

Run the targeted active recall test if available, then run standard suite compare/rollback.

Expected relevant area:

```bash
node --test .\tests\phase-c-active-recall.test.js
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json --require-ready
```

Then run broader validation if the diff touches shared recall code.

### 9.7 Recall Main Chain / TagMemo / EPA / ResidualPyramid / Rerank Change

At minimum:

```bash
npm test
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run gate:mainline
```

If MCP or HTTP contract is touched:

```bash
npm run gate:mainline:strict
```

### 9.8 LightMemo Directory Strategy Change

Validate candidate-stage filtering semantics.

Use standard suite filters if relevant, and include cases for:

- `maid`
- `folder`
- `maid AND (folder1 OR folder2)`
- `search_all_knowledge_bases=true`
- excluded folders
- directory alias map

At minimum run targeted tests plus standard suite compare/rollback.

### 9.9 Embedding Provider / Rerank Provider Change

Never expose provider API keys.

Use:

```bash
npm run provider-smoke -- --json
```

If retrieval quality or provider comparison is affected:

```bash
npm run provider-benchmark -- --json
```

If profile migration behavior is affected, follow the profile migration path below.

### 9.10 Embedding Profile / Fingerprint / Profile Migration Change

Start with dry-run:

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

If a baseline fingerprint is involved, use the documented baseline gate flags.

### 9.11 Shadow Store / Diary / Vector Index / Candidate Cache Change

This area affects durable memory state.

Prefer fixture tests.

Be careful with:

```bash
npm run rebuild-shadow
```

It may rewrite shadow/index state from diary according to current config. Treat real rebuilds as high risk unless the user asked for maintenance.

For implementation validation, prefer tests and fixture stores.

### 9.12 Cleanup / Legacy Chunk Change

Dry-run first:

```bash
npm run cleanup-legacy-chunks -- --dry-run --json
```

Do not run apply/confirm cleanup without explicit approval.

### 9.13 Rollback Planning Change

Use:

```bash
npm run rollback:mainline:plan -- --json
```

This is read-only planning. It must not silently modify `config.toml`.

Changing actual Codex config requires explicit approval.

### 9.14 CI / GitHub Workflow Change

High risk because it changes validation gates for future work.

Run local equivalent commands first where possible.

Do not push workflow changes without explicit approval.

---

## 10. Memory and Data Safety

Sensitive data includes:

- `.env`
- API keys
- provider keys
- rerank keys
- database URLs
- service account files
- tokens
- private keys
- production endpoints if treated as sensitive
- raw diary or chat content not needed in summaries

Rules:

- do not print secret values
- do not write secrets into docs
- do not write secrets into tests
- do not write secrets into memory
- do not expose full raw diary/chat content in reports
- use placeholders such as `<REDACTED_API_KEY>`
- prefer `.env.example` and example env files
- never commit real `.env`

Audit logs may contain metadata about writes/recalls. Treat them as potentially sensitive.

---

## 11. Record / Search / Overview Policy

### record_memory

Must preserve:

- Codex bridge constraints
- diary-compatible write
- shadow store write
- vector index update
- write audit
- rejection behavior for unsafe writes

Any change must prove accepted and rejected paths.

### search_memory

Must preserve:

- process / knowledge / both compatibility
- safe `include_content` behavior
- recall audit behavior
- candidate cache behavior where applicable
- redaction or safe handling of sensitive content

### memory_overview

Must remain safe for operational inspection.

It may expose counts, health, recent activity, audit summaries, and index status.

It must not expose raw secrets.

---

## 12. Active Memory Policy

Active memory is already implemented and compatibility-sensitive.

Protected areas:

- `chat-history-index store`
- force rebuild
- incremental sync
- donor-style VChat root scanning
- `DeepMemo`
- `TopicMemo`
- advanced query syntax
- blocked keywords
- optional rerank fallback
- topic/content error semantics
- suite fixtures and manifests

Default rule:

- keep donor compatibility unless explicitly changing it
- add/adjust fixture coverage before changing behavior
- use compare and rollback harnesses as the safety rail
- do not silently weaken donor-style diagnostics

---

## 13. Compare / Rollback Harness Policy

The compare harness is a read-only behavior comparison tool.

The rollback harness is a read-only readiness tool.

Use them before making claims about donor compatibility or rollback safety.

Important commands:

```bash
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

For focused work, use filters:

```bash
--category
--expectation
--tool
--fixture
--tag
--tag-all
--exclude-tag
--exclude-fixture
```

Do not treat a single ad-hoc case as suite validation.

---

## 14. Mainline Gate Policy

Use mainline gates to protect the default chain.

Daily or normal confidence gate:

```bash
npm run gate:mainline
```

Strict gate for MCP/mainline/compare/rollback-sensitive changes:

```bash
npm run gate:mainline:strict
```

`gate:mainline:strict` may include contract tests and `npm test`.

If gate fails, diagnose in order:

1. health
2. compare
3. rollback
4. targeted CLI/test

Do not pile new changes onto a failing gate without identifying the failure.

---

## 15. HTTP Runtime Policy

HTTP MCP is the recommended Codex Desktop route.

Common safe checks:

```bash
npm run start:http:ensure
npm run observe:http -- --json
```

`observe:http` should be used to inspect:

- `/health`
- HTTP logs
- watchdog logs
- bridge audit
- recall audit

If `summary.status=error`, try `start:http:ensure` before deeper debugging.

If `summary.status=warn`, inspect watchdog and HTTP logs.

Do not install startup tasks or watchdog services without explicit approval.

---

## 16. Provider and Profile Policy

Provider changes can affect recall quality and cost.

Rules:

- never print API keys
- prefer example env files for documentation
- smoke before benchmark
- benchmark before claiming quality improvement
- dry-run before profile rebuild
- profile gate before migration claims
- avoid full Top-K dumps in routine reports unless needed

Recommended sequence for profile migration investigation:

```bash
npm run rebuild-profile -- --dry-run --json
npm run profile-health
npm run shadow-compare -- --query "embedding profile migration"
npm run profile-gate -- --json --summary-only
```

Apply/confirm rebuild requires explicit approval.

---

## 17. Rollback Policy

Rollback planning is allowed as read-only work.

Use:

```bash
npm run rollback:mainline:plan -- --json
```

This may produce a config patch.

Do not apply that patch automatically.

Changing `C:\Users\617\.codex\config.toml` or any Codex config requires explicit approval.

Before recommending a real rollback, verify:

- current mode
- rollback target readiness
- rollback target reachability
- tool list compatibility
- post-rollback validation steps

---

## 18. Dependency Policy

Do not add, remove, upgrade, or downgrade dependencies without explicit approval.

Allowed automatically only when local validation setup uses existing manifests and does not modify manifests/lockfiles:

```bash
npm ci
```

Use `npm install` only if the user explicitly asks or if the project documentation requires it and the effect is understood.

Stop before:

- changing `package.json`
- changing lockfiles
- changing package manager
- global installs
- audit-fix/update commands

---

## 19. File Modification Policy

Before editing:

- identify exact target file
- inspect nearby context
- preserve existing style
- preserve naming
- avoid unrelated formatting
- avoid broad rewrites

During editing:

- make the smallest useful change
- keep behavior local to the task
- avoid mixing refactors with bug fixes
- avoid touching data/log files unless the task is maintenance

After editing:

- inspect diff
- run targeted validation
- run broader validation if the changed layer requires it
- report validation gaps honestly

Do not delete untracked files.

Do not overwrite user-owned changes.

---

## 20. Hard Stop Gates

Stop and request explicit approval before:

- commit
- push
- merge
- release
- deployment
- remote write
- actual Codex config modification
- Windows scheduled task install/update/removal
- HKCU Run modification
- editing `.env` or real secret files
- dependency changes
- real migration
- profile rebuild `--confirm`
- cleanup apply/confirm
- hard deletion of data/logs/diary/indexes
- broad architecture rewrite
- running destructive commands
- writing outside workspace root
- overwriting user-owned work

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

---

## 21. Recommended Next-Phase Direction

This repository already has Phase C/D/E history.

Do not restart at “Phase 1 local memory core.”

Future roadmap should continue from existing state.

Reasonable next directions include:

```text
Phase F — VCP full-memory parity hardening
Phase G — memory governance / proposal / supersession / tombstone
Phase H — multi-agent memory arbitration
Phase I — observability / admin review surface
```

These names are proposals, not authorization.

Implement only when the user asks.

---

## 22. Multi-Agent Work Policy

If multiple Codex workers are used:

- one session acts as commander/reviewer
- workers work on isolated files or test scopes
- workers must not edit the same file blindly
- workers report checkpoints
- final integration is serial
- final validation is run once from a clean controlling state

For memory behavior changes, workers should propose changes and evidence.

Do not let workers independently alter durable memory policy, migration behavior, or default chain routing.

---

## 23. Handoff Policy

For non-trivial work, leave a handoff:

```text
Goal:
Workspace:
Branch:
Worktree:
Changed:
Validated:
Not validated:
Risks:
Next safe step:
```

For memory/runtime work, include:

```text
MCP mode:
HTTP health:
Audit impact:
Recall impact:
Rollback readiness:
Suite/gate result:
```

A handoff is not authority. Resume by verifying repository reality.

---

## 24. Output Discipline

For repository work, report:

```text
Workspace:
Mode:
Risk:
Branch:
Worktree:
Changed:
Validated:
Not validated:
Result:
Remaining risk:
Next:
```

For MCP/runtime work, add:

```text
MCP mode:
Health:
Gate:
Compare:
Rollback:
Audit:
```

For provider/profile work, add:

```text
Provider:
Profile:
Smoke:
Benchmark:
Profile gate:
Secrets:
```

Never bury a failed gate inside a long paragraph.

Never expose secrets.

Never overclaim.

---

## 25. Final Rule

This project is already alive.

Do not rebuild its skeleton while it is breathing.

Protect the current contracts.

Move in small verified steps.

Use the gates.

Respect the audits.

Keep the memory trustworthy.
