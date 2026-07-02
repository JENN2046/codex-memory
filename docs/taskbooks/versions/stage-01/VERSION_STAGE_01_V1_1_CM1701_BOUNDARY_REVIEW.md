# Version Stage 01 v1.1 - CM-1701 VCPToolBox Target Boundary Review

```yaml id="version-stage-01-v1-1-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_not_executed
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-01
stage_reference: docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
version_id: CM-1701
version_label: stage-01-v1.1
version_name: VCPToolBox Target Boundary Review
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: prepare and verify a docs-only execution boundary for future target-specific runtime inspection
runtime_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`, especially:

- Section 3, which defines the North Star for governed Codex/Claude use of native VCPToolBox memory;
- Section 5, which defines the Master / Stage / Version / Execution Envelope / Review chain;
- Section 6, Workstream A, which covers VCPToolBox target and profile governance;
- Section 6, Workstream B, which requires exact-approved runtime proofs later but does not grant them now.

This Version must not redefine or expand the project final goal.

## 2. Stage Reference

This Version belongs to `Stage 01 - VCPToolBox Target Boundary Governance`.

It serves Stage 01 by turning the stage goal into one concrete reviewable unit: a locked boundary for the future CM-1701 runtime inspection path.

## 3. Version Goal

Prepare and verify the execution boundary for future target-specific VCPToolBox runtime inspection.

The concrete deliverable is a docs-only boundary packet:

- Stage document;
- this Version document;
- Execution Envelope;
- Review prompt.

The Version is complete only when the boundary packet exists, validation passes, and the Review prompt can ask the alignment question without ambiguity.

## 4. Allowed Work

Allowed work for this Version:

- create or update the Stage 01 taskbook document;
- create or update this Version document;
- create or update the Execution Envelope for this Version;
- create or update the Review prompt for this Version;
- save a ColaMeta prompt file for CM-1701;
- insert a ColaMeta plan version for CM-1701;
- run docs-only validation and ColaMeta validation preview/run/status.

## 5. Forbidden Work

This Version forbids:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- reading `.env`, `.env.*`, `config.env`, credentials, tokens, cookies, provider auth, proxy config, or private runtime state;
- raw DailyNote, RAG, vector, prompt, sqlite, jsonl, audit, cache, or private memory reads;
- broad memory scan, export, import, migration, sync, or backfill;
- durable memory write, VCP write, or `record_memory` call;
- provider/API call;
- source/runtime/test changes outside the docs-only preparation scope;
- public MCP tool/schema expansion;
- startup, watchdog, service install, service restart, or config mutation;
- push, PR, merge, force push, tag, release, deploy, cutover, or readiness claim.

## 6. Required Validation

Minimum validation:

```bash
git diff --check
bash scripts/validate-local.sh docs --quiet-scripts
```

Controlled ColaMeta validation should also be run with `manage_validation_run` for the target files in this Version when the file set exists.

## 7. Done Definition

This Version is prepared when:

- the Stage document exists and explains why it serves the Master goal;
- this Version document exists and defines one small capability;
- the Execution Envelope exists and locks `allowed_files`, `forbidden_files`, `out_of_scope`, and validation;
- the Review document exists and asks `Does this work still serve project_final_goal?`;
- the ColaMeta prompt/plan entry exists or a blocker is recorded;
- docs-only validation passes or a precise validation blocker is recorded;
- no Red Lane action was taken or implied.

## 8. Review Question

Closeout must answer:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, do not mark the Version complete. Move to review or plan adjustment.
