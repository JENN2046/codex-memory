# Version Stage 01 v1.4 - CM-1705 Exact-Approved Live Inspection Execution Boundary

```yaml id="version-stage-01-v1-4-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-01
stage_reference: docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
version_id: CM-1705
version_label: stage-01-v1.4
version_name: VCPToolBox Exact-Approved Live Inspection Execution Boundary
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.3.0 / CM-1704
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only approval and execution boundary for future exact-approved live inspection
runtime_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction that ColaMeta becomes a goal-anchored AI
delivery command layer by making future live execution conditional on exact
approval, a narrow execution envelope, low-disclosure receipt policy, and a
Review answer tied to `project_final_goal`.

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

CM-1705 serves Stage 01 by defining the exact approval and execution envelope
that must exist before a future target-specific live inspection can be
considered.

## 3. Prior Version Reference

Prior Version:

```text
v1.3.0 / CM-1704 - VCPToolBox Target-Specific Runtime Inspection Receipt Contract
```

CM-1704 defined the low-disclosure receipt shape for future exact-approved
inspection evidence.

CM-1705 prepares the pre-execution boundary that references that receipt
contract. It still does not call or inspect live VCPToolBox.

## 4. One Capability

Add a fixture-only execution boundary helper:

```text
src/core/VcpToolBoxExactApprovedLiveInspectionExecutionBoundary.js
```

The helper accepts caller-provided sanitized packet/envelope summaries and
returns one of:

- `prepared_for_exact_approved_execution`
- `blocked_needs_exact_approval`
- `needs_plan_adjustment`

Prepared means the future execution boundary is machine-checkable. It does not
mean execution happened, readiness exists, or runtime proof is complete.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - src/core/VcpToolBoxExactApprovedLiveInspectionExecutionBoundary.js
  - tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js
  - docs/CM1705_VCPTOOLBOX_EXACT_APPROVED_LIVE_INSPECTION_EXECUTION_BOUNDARY.md
  - docs/taskbooks/versions/stage-01/VERSION_STAGE_01_V1_4_CM1705_EXACT_APPROVED_LIVE_INSPECTION_EXECUTION_BOUNDARY.md
  - .agent_board/CURRENT_FACTS.json
  - .agent_board/VALIDATION_LOG.md
```

## 6. Forbidden Work

This Version forbids:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- process, port, target, endpoint, path, config, `.env`, `config.env`, secret,
  credential, token, cookie, provider auth, proxy config, or private runtime
  state reads;
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
node --test tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js
node --test tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- the helper prepares a boundary only when Master / Stage / Version,
  `project_final_goal`, CM-1704 receipt contract, exact approval binding,
  execution envelope, and Review answer are present;
- approval-line values are never returned;
- allowed future runtime actions are limited to target presence, runtime
  handshake, and target-specific no-memory inspection;
- runtime budget is capped and memory/provider/write budgets are zero;
- every pre-execution counter remains zero;
- unsafe fields, runtime action expansion, budget expansion, already-executed
  runtime evidence, readiness, release, deploy, push, and complete V8 claims
  fail closed;
- validation passes or a precise blocker is recorded;
- no forbidden work was performed or implied.

## 9. Closeout Question

Every closeout must answer exactly:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, report `needs_plan_adjustment`; do not mark complete
by assumption.
