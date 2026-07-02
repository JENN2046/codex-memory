# Execution Envelope - Stage 01 v1.1 CM-1701 Boundary Review

```yaml id="execution-envelope-stage-01-v1-1-metadata"
document_type: execution_envelope
schema_version: execution_envelope.v1
status: prepared
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-01
version_id: CM-1701
version_reference: docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
master_taskbook: PROJECT_MASTER_TASKBOOK.md
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
lane: Green Lane docs-only preparation
runtime_authorization: not_granted
```

## 1. Execution Boundary

This envelope locks the CM-1701 execution boundary for a docs-only preparation task.

The executor may prepare, inspect, or repair the boundary packet. The executor may not use this Version as approval for runtime inspection, VCPToolBox calls, raw memory reads, provider/API calls, public MCP expansion, config mutation, push, release, or readiness claims.

## 2. Allowed Files

Agent `allowed_files` for CM-1701:

```yaml id="allowed-files"
allowed_files:
  - docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
  - docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
  - docs/taskbooks/envelopes/EXECUTION_ENVELOPE_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
  - docs/taskbooks/reviews/REVIEW_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
```

Commander setup may also create or update ColaMeta orchestration records for this Version:

```yaml id="commander-setup-files"
commander_setup_files:
  - .colameta/prompts/v1.1.0.md
  - .colameta/plan.json
  - .colameta/state.json
```

Executor changes outside `allowed_files` are scope violations unless Jenn gives a separate exact approval or the Commander issues a new envelope.

## 3. Forbidden Files

```yaml id="forbidden-files"
forbidden_files:
  - .env
  - .env.*
  - config.env
  - "**/*secret*"
  - "**/*credential*"
  - "**/*token*"
  - "**/*cookie*"
  - src/**
  - tests/**
  - scripts/**
  - package.json
  - package-lock.json
  - pnpm-lock.yaml
  - yarn.lock
  - .agent_board/**
  - .colameta/runtime/**
```

Forbidden file patterns do not grant permission to read or summarize sensitive files. They identify hard boundaries.

## 4. Out Of Scope

```yaml id="out-of-scope"
out_of_scope:
  - live VCPToolBox runtime inspection
  - live VCPToolBox calls
  - reading secrets, credentials, tokens, cookies, auth, proxy config, or private runtime state
  - raw DailyNote, RAG, vector, prompt, sqlite, jsonl, audit, cache, or private memory reads
  - broad memory scan, export, import, migration, sync, or backfill
  - durable memory write, VCP write, or record_memory call
  - provider/API call
  - dependency install, update, or lockfile change
  - public MCP tool or schema expansion
  - startup, watchdog, service install, service restart, or config mutation
  - source/runtime/test behavior changes
  - push, PR, merge, force push, tag, release, deploy, cutover, or readiness claim
```

## 5. Acceptance Commands

Required local validation:

```yaml id="acceptance-commands"
acceptance_commands:
  - command: git diff --check
    timeout_seconds: 300
    continue_on_failure: false
  - command: bash scripts/validate-local.sh docs --quiet-scripts
    timeout_seconds: 900
    continue_on_failure: false
```

Controlled ColaMeta validation should also be used for the target files when available:

```yaml id="colameta-validation"
colameta_validation:
  tool: manage_validation_run
  scope: target_files
  target_files:
    - docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
    - docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
    - docs/taskbooks/envelopes/EXECUTION_ENVELOPE_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
    - docs/taskbooks/reviews/REVIEW_STAGE_01_V1_1_CM1701_BOUNDARY_REVIEW.md
```

## 6. Manual Acceptance

Manual acceptance checklist:

- The Version cites the Master and Stage.
- The Version delivers one bounded capability only.
- `allowed_files` are explicit and narrow.
- Red Lane actions remain excluded.
- Docs-only evidence is not called runtime evidence.
- The Review asks `Does this work still serve project_final_goal?`.
- If the answer is uncertain, the outcome is review or plan adjustment, not completion.

## 7. Stop Conditions

Stop and report before continuing if:

- an executor needs a file outside `allowed_files`;
- validation fails and the fix is not clearly docs-only;
- any Red Lane action appears necessary;
- runtime or memory evidence is requested without exact approval;
- the work no longer clearly serves `project_final_goal`.

## 8. Rollback Posture

This Version is docs-only. Before commit, rollback is ordinary Git/file rollback of the new taskbook files and ColaMeta plan prompt/plan edits. After commit, rollback is a normal revert commit unless Jenn explicitly authorizes a different Git operation.
