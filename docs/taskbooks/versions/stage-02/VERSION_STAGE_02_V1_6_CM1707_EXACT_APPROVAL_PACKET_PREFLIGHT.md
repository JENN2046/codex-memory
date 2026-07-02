# Version Stage 02 v1.6 - CM-1707 Exact Approval Packet Preflight

```yaml id="version-stage-02-v1-6-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_reference: docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
version_id: CM-1707
version_label: stage-02-v1.6
version_name: Stage 02 Exact Approval Packet Preflight
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.5.0 / CM-1706
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only exact approval packet preflight
runtime_authorization: not_granted
approval_line_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction by preparing the approval packet review
boundary that must exist before any future live VCPToolBox inspection can be
requested.

It does not expand the Master goal and does not authorize runtime execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
```

Stage 02 prepares exact approval readiness. CM-1707 handles only the approval
packet preflight shape.

## 3. Prior Version Reference

Prior Version:

```text
v1.5.0 / CM-1706 - Stage 01 Closeout / Stage 02 Exact-Approved Live Inspection Readiness Gate
```

CM-1706 opened Stage 02 as readiness-gate work only. CM-1707 prepares a future
approval packet candidate shape while keeping approval and runtime unauthorized.

## 4. One Capability

Add a fixture-only approval packet preflight helper:

```text
src/core/VcpToolBoxStage02ExactApprovalPacketPreflight.js
```

The helper accepts caller-provided sanitized summaries and returns one of:

- `exact_approval_packet_preflight_ready`
- `blocked_needs_stage_02_readiness_gate`
- `blocked_needs_exact_approval_packet_boundary`
- `blocked_needs_receipt_plan`
- `needs_plan_adjustment`

Prepared means the packet candidate shape is reviewable. It does not mean an
approval line exists, approval was granted, live execution happened, runtime
readiness exists, VCPToolBox compatibility was proven, or complete V8 is ready.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - .colameta/prompts/v1.6.0.md
  - src/core/VcpToolBoxStage02ExactApprovalPacketPreflight.js
  - tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js
  - docs/CM1707_VCPTOOLBOX_STAGE02_EXACT_APPROVAL_PACKET_PREFLIGHT.md
  - docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
  - docs/taskbooks/versions/stage-02/VERSION_STAGE_02_V1_6_CM1707_EXACT_APPROVAL_PACKET_PREFLIGHT.md
  - .agent_board/CURRENT_FACTS.json
  - .agent_board/VALIDATION_LOG.md
```

## 6. Forbidden Work

This Version forbids:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- target discovery, process probing, port probing, endpoint probing, path
  discovery, config reads, `.env`, `config.env`, secret, credential, token,
  cookie, provider auth, proxy config, private-state reads, or runtime log
  reads;
- raw memory, raw runtime response, DailyNote, RAG, vector, prompt, sqlite,
  jsonl, cache, or provider response reads;
- durable memory write or VCP write;
- provider/API call;
- approval-line issue, consume, storage, or value exposure;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js
node --test tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- CM-1706 readiness gate is required;
- CM-1705 future execution boundary is required;
- CM-1704 receipt plan is required;
- packet candidate is future-only and exact-approval-required;
- approval line is not present, issued, consumed, stored, or exposed;
- current preflight actions and budgets remain zero-runtime;
- future runtime actions remain CM-1705-bound;
- unsafe fields, runtime authorization, approval-line values, budget/counter
  expansion, readiness, release, deploy, push, and complete V8 claims fail
  closed;
- validation passes or a precise blocker is recorded;
- no forbidden work was performed or implied.

## 9. Closeout Question

Every closeout must answer exactly:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, report `needs_plan_adjustment`; do not mark complete
by assumption.
