# Stage 01 - VCPToolBox Target Boundary Governance

```yaml id="stage-01-metadata"
document_type: colameta_stage_taskbook
schema_version: taskbook_stage.v1
status: prepared
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-01
stage_name: VCPToolBox Target Boundary Governance
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
serves_master_workstreams:
  - Workstream A - VCPToolBox Target And Profile Governance
  - Workstream B - Exact-Approved Runtime Proofs
  - Workstream F - Mainline Protection And Runtime Hardening
default_lane: Green Lane docs-only preparation
runtime_authorization: not_granted
```

## 1. Master Alignment

Master final direction: `codex-memory` should become the governed Codex/Claude bridge that can use the native VCPToolBox memory system from sustained workflows without downgrading the final target to summary-only behavior.

This Stage serves that Master direction by forcing every future VCPToolBox target interaction to be target-anchored, file-scoped, validation-scoped, and reviewable before any live runtime proof is attempted.

It specifically serves:

- Workstream A, by defining the target/profile boundary before runtime inspection.
- Workstream B, by preparing exact approval requirements for later runtime proofs without granting them now.
- Workstream F, by preserving existing `vcp_codex_memory` contracts while bridge work advances.

## 2. Stage Goal

Prepare the governance boundary for a future target-specific VCPToolBox runtime inspection execution path.

The Stage does not execute the inspection. It makes the next Version small enough to review and safe enough to delegate under ColaMeta: one concrete capability, one allowed file set, one validation set, and one alignment question.

## 3. Required Evidence

Stage evidence must include:

- this Stage document;
- a Version document that cites the Master and this Stage;
- an Execution Envelope with `allowed_files`, `forbidden_files`, `out_of_scope`, and validation commands;
- a Review document that asks `Does this work still serve project_final_goal?`;
- local validation output for docs-only scope;
- a guarded local commit if repository commit rules pass.

Docs-only evidence must not be described as live runtime proof, target readiness, VCPToolBox compatibility proof, or memory readiness.

## 4. Non-Goals

This Stage does not authorize:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- reading `.env`, `.env.*`, `config.env`, credentials, tokens, cookies, provider auth, proxy config, or private runtime state;
- raw DailyNote, RAG, vector, prompt, sqlite, jsonl, audit, cache, or private memory reads;
- broad memory scan, export, import, migration, sync, or backfill;
- durable memory write, VCP write, or `record_memory` call;
- provider/API call;
- public MCP tool/schema expansion;
- startup, watchdog, service install, service restart, or config mutation;
- push, PR, merge, force push, tag, release, deploy, cutover, or readiness claim.

## 5. Exit Criteria

Stage 01 may be considered prepared when:

- the Stage, Version, Execution Envelope, and Review artifacts exist;
- the Version delivers only one bounded capability;
- the Execution Envelope is concrete enough for ColaMeta Runner enforcement;
- the Review artifact keeps the `project_final_goal` alignment question explicit;
- docs-only validation passes;
- no Red Lane action was taken or implied.

## 6. First Version

First Version under this Stage:

```yaml id="stage-01-first-version"
version_id: CM-1701
version_name: VCPToolBox Target Boundary Review
version_goal: prepare and verify the execution boundary for future target-specific runtime inspection
status: prepared_not_executed
```
