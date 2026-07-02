# PROJECT_MASTER_TASKBOOK.md

```yaml id="project-master-taskbook-summary"
document_type: project_master_taskbook
schema_version: project_master_taskbook.v1
status: master_taskbook_initial_draft
project: codex-memory
managed_project_name: codex-memory
created_at: 2026-07-02
authority_status: planning_anchor_only
commander_context: delegated_commander_working_session_under_jenn_current_instruction
stable_fact_sources:
  - README.md
  - CURRENT_STATE.md
  - STATUS.md
  - .agent_board/CURRENT_FACTS.json
  - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
  - CODEX_MEMORY_NEXT_PHASE_PLAN.md
  - PHASE_NAVIGATION.md
  - DOCS_GOVERNANCE.md
```

## 1. Purpose

This Master Taskbook is the top-level planning anchor for the ColaMeta-managed
`codex-memory` project.

It records the durable goal, authority boundary, workstreams, evidence chain,
execution policy, and first safe implementation route for continuing the
VCPToolBox memory capability line.

It does not replace `README.md`, `CURRENT_STATE.md`, `STATUS.md`,
`.agent_board/CURRENT_FACTS.json`, or the source/tests as fact sources. Live
Git facts such as current `HEAD`, `origin/main`, ahead/behind, and dirty
worktree state must still come from fresh Git commands.

## 2. Authority Boundary

Jenn remains the root owner and final Commander authority for the local agent
environment and this repository.

Under Jenn's current instruction, Nobao/Codex may occupy the working Commander
seat for this Master Taskbook task: prepare the planning anchor, choose the next
safe local route, create bounded ColaMeta plan versions, run safe local
validation, and report evidence.

This document does not authorize:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- reading `.env`, `.env.*`, `config.env`, credentials, tokens, cookies, provider
  auth, proxy config, or private runtime state;
- raw DailyNote, RAG, vector, prompt, sqlite, jsonl, audit, cache, or private
  memory reads;
- broad memory scan, export, import, migration, sync, or backfill;
- durable memory write, VCP write, or `record_memory` call;
- provider/API call;
- public MCP tool/schema expansion;
- startup, watchdog, service install, service restart, or config mutation;
- push, PR, merge, force push, tag, release, deploy, cutover, or readiness
  claim.

Any Red Lane action still requires separate exact, current, explicit approval.

## 3. North Star

`codex-memory` should become the governed Codex/Claude bridge that can use the
native VCPToolBox memory system from sustained workflows without downgrading the
final target to summary-only behavior.

Target architecture:

```text
Codex / Claude sustained conversation
  -> codex-memory governance bridge
    -> VCPToolBox memory runtime
      -> DailyNote / DailyNoteManager / KnowledgeBaseManager
      -> TagMemo / LightMemo / TDBKnowledge
      -> DeepMemo / TopicMemo / MeshMemo / RAGDiaryPlugin
```

VCPToolBox remains the native owner of VCP memory behavior. `codex-memory`
provides target/profile governance, approval gates, low-disclosure projections,
audit receipts, rollback posture, client scope governance, and Codex/Claude
workflow integration.

## 4. Current Project Reality

Current repository reality, as of this Master Taskbook draft:

- `codex-memory` is an independent `vcp_codex_memory` implementation.
- Public MCP tools to protect are `record_memory`, `search_memory`, and
  `memory_overview`, with controlled mutation dry-run tools present under exact
  approval boundaries.
- The implementation already has HTTP and stdio MCP entrypoints, diary-compatible
  writes, SQLite shadow store, vector index, recall/write audit, candidate
  cache, active-memory compatibility, DeepMemo/TopicMemo compatibility, compare
  and rollback harnesses, provider/profile tooling, mainline gates, and safety
  hardening.
- Phase D/E default-mainline work is closed; later work is parity hardening,
  memory governance, Codex/Claude scoping, observability, and VCPToolBox bridge
  work.
- The current VCPToolBox line is fixture/source/docs governed and has not
  executed live target inspection, live VCPToolBox calls, raw memory reads, or
  durable VCP writes.
- `docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md` is the current vision plan
  for the VCPToolBox memory capability line.

## 5. Master Workstreams

### Workstream A - VCPToolBox Target And Profile Governance

Goal: represent real VCPToolBox targets, transports, profiles, budgets, and
operator packets without leaking locator, endpoint, config, auth, token, secret,
or raw memory values.

Current evidence includes CM-1689 through CM-1700.

Next safe local route: continue with a boundary review for the future
CM-1701 target-specific runtime inspection execution path, unless Jenn redirects.

### Workstream B - Exact-Approved Runtime Proofs

Goal: after safe packet/approval contracts are complete, run only exact-approved,
bounded, no-memory or explicitly scoped runtime proofs.

Default state: not authorized by this Master Taskbook.

### Workstream C - Read-Only VCP Recall Profiles

Goal: move from `observe-lite` to `observe-full` and then
`trusted-full-read` only after target, auth, scope, output shape, budget, and
receipt evidence are all bounded.

Default state: no broad scan, no raw persistence, no readiness claim.

### Workstream D - Sustained Codex/Claude Workflow Integration

Goal: use VCPToolBox recall at bounded points in real Codex/Claude workflows:
startup, resume, task selection, validation failure, handoff, checkpoint,
commit/push decision, and user-requested context recall.

Default state: profile-gated and receipt-gated only.

### Workstream E - Write Proposal Before Durable Write

Goal: add `trusted-write-proposal` before any durable VCP write integration.
Durable writes require exact approval, rollback/cleanup/tombstone posture, and
low-disclosure receipts.

Default state: proposal-only until separately authorized.

### Workstream F - Mainline Protection And Runtime Hardening

Goal: preserve existing `vcp_codex_memory` behavior, mainline gates, rollback
readiness, HTTP stability, provider fail-closed behavior, and public MCP surface
boundaries while VCPToolBox bridge work advances.

## 6. ColaMeta Execution Policy

The project is registered in ColaMeta as `project_name=codex-memory` in
`managed` mode.

ColaMeta must be used as a governed planning and evidence layer, not as a bypass
around repository rules.

Default route for new implementation versions:

1. Read current project facts through `analyze_project_state` and fresh Git
   commands.
2. Save a bounded version prompt with `manage_prompt_file preview -> apply`.
3. Insert a plan version with `manage_plan_version insert_from_prompt_file_preview`
   or `insert_preview`.
4. Keep `allowed_files`, `forbidden_files`, `out_of_scope`, and
   `acceptance_commands` specific.
5. Use `manage_validation_run inspect -> preview -> run -> status` for controlled
   validation when appropriate.
6. Treat executor reports, receipts, and previews as evidence, not acceptance.
7. Commit only through the repository's guarded local commit rules.
8. Do not push unless an exact push authorization or a fully passing local
   safe-push policy applies.

No ColaMeta preview, receipt, runtime status, readiness packet, or workflow run
is by itself a ReviewDecision, GateEvent, Delivery State acceptance, runtime
execution approval, stable replacement approval, commit approval, or push
approval.

## 7. First Route From This Master Taskbook

Initial taskbook adoption route:

```yaml id="first-route"
route_id: CM-MASTER-0001
route_name: codex-memory Master Taskbook Anchor
lane: Green
type: docs-only planning anchor
allowed_files:
  - PROJECT_MASTER_TASKBOOK.md
  - PROJECT_MASTER_TASKBOOK.zh-CN.md
forbidden_actions:
  - live VCPToolBox call
  - target-specific runtime inspection
  - raw memory read
  - durable memory write
  - provider/API call
  - public MCP expansion
  - config/env/secret read or edit
  - executor run
  - push
validation:
  - inspect diff
  - git diff --check
  - docs validation when available
```

After this Master Taskbook is accepted, the next ColaMeta plan version should be
created for a small route such as:

```text
CM-1701 VCPToolBox target-specific runtime inspection execution boundary review
```

That next route should remain source/docs/fixture review by default. It must not
execute the target-specific runtime inspection unless Jenn provides a separate
exact approval line bound to target, commit, scope, budget, expiry, and output
policy.

## 8. Review And Acceptance Criteria

This Master Taskbook is ready for local acceptance when:

- it matches README / CURRENT_STATE / STATUS / VCPToolBox vision facts;
- it does not claim runtime readiness, production readiness, release readiness,
  cutover readiness, or complete V8;
- it does not authorize Red Lane actions;
- it identifies ColaMeta as a governed planning/evidence system;
- it provides a narrow first route and validation boundary;
- diff inspection and docs validation do not show contradictions or formatting
  errors.

Acceptance of this document still does not authorize live runtime work, memory
writes, public MCP expansion, or remote Git operations.
