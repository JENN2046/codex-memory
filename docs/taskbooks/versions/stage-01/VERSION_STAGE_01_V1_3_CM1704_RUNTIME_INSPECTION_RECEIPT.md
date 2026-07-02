# Version Stage 01 v1.3 - CM-1704 Runtime Inspection Receipt Contract

```yaml id="version-stage-01-v1-3-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-01
stage_reference: docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
version_id: CM-1704
version_label: stage-01-v1.3
version_name: VCPToolBox Target-Specific Runtime Inspection Receipt Contract
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.2.0 / CM-1702
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only low-disclosure receipt contract for future exact-approved target-specific runtime inspection
runtime_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction that ColaMeta becomes a goal-anchored AI
delivery command layer by making future live VCPToolBox evidence reviewable
against `project_final_goal` before any state expansion or readiness claim.

This Version does not expand the Master goal and does not authorize runtime
execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
```

Stage 01 exists to keep future VCPToolBox target interaction target-anchored,
file-scoped, validation-scoped, and reviewable before any live runtime proof is
attempted.

CM-1704 serves Stage 01 by defining the receipt shape a future exact-approved
target-specific inspection must produce.

## 3. Prior Version Reference

Prior Version:

```text
v1.2.0 / CM-1702 - VCPToolBox Commander Runtime Inspection Go/No-Go Packet
```

CM-1702 passed after ColaMeta managed validation was repaired to use the
project-required Node 22 runtime.

CM-1704 consumes that route by preparing the receipt contract only. It still
does not call or inspect live VCPToolBox.

## 4. One Capability

Add a fixture-only receipt helper:

```text
src/core/VcpToolBoxTargetSpecificRuntimeInspectionReceipt.js
```

The helper accepts caller-provided sanitized evidence and returns one of:

- `accepted_for_review`
- `blocked_needs_exact_approval`
- `needs_plan_adjustment`

Accepted receipts are `reviewable_not_ready`. They are not runtime readiness,
cutover readiness, release readiness, complete V8 proof, or permission to
expand public MCP tools.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - src/core/VcpToolBoxTargetSpecificRuntimeInspectionReceipt.js
  - tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js
  - docs/CM1704_VCPTOOLBOX_TARGET_SPECIFIC_RUNTIME_INSPECTION_RECEIPT_CONTRACT.md
  - docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_3_CM1704_RUNTIME_INSPECTION_RECEIPT.md
  - .agent_board/CURRENT_FACTS.json
  - .agent_board/VALIDATION_LOG.md
```

## 6. Forbidden Work

This Version forbids:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- reading target paths, endpoints, config, `.env`, `config.env`, secrets,
  credentials, tokens, cookies, provider auth, proxy config, or private runtime
  state;
- raw memory, raw runtime response, DailyNote, RAG, vector, prompt, sqlite,
  jsonl, cache, or provider response reads;
- durable memory write or VCP write;
- provider/API call;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js
node --test tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- the helper accepts only sanitized exact-approval-bound receipt evidence;
- approval-line values are never present in accepted output;
- runtime counters remain bounded;
- memory/provider/write/public-MCP/startup/config/readiness/release/deploy/push
  counters remain zero;
- unsafe fields or output expansion flags fail closed;
- the receipt answer to `project_final_goal` is explicit and positive;
- validation passes or a precise blocker is recorded;
- no forbidden work was performed or implied.

## 9. Closeout Question

Every closeout must answer exactly:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, report `needs_plan_adjustment`; do not mark complete
by assumption.
