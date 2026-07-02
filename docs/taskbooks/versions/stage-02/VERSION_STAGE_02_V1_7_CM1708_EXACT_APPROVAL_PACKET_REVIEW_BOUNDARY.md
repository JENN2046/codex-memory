# Version Stage 02 v1.7 - CM-1708 Exact Approval Packet Review Boundary

```yaml id="version-stage-02-v1-7-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_reference: docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
version_id: CM-1708
version_label: stage-02-v1.7
version_name: Stage 02 Exact Approval Packet Review Boundary
created_at: 2026-07-03
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.6.0 / CM-1707
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only exact approval packet review boundary
runtime_authorization: not_granted
approval_line_authorization: not_granted
approval_line_generation: forbidden
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction by adding the review boundary that must sit
between a future packet candidate and any human exact-approval decision.

It does not expand the Master goal and does not authorize runtime execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
```

Stage 02 prepares exact approval readiness. CM-1708 handles only the packet
candidate review boundary after CM-1707 packet preflight.

## 3. Prior Version Reference

Prior Version:

```text
v1.6.0 / CM-1707 - Stage 02 Exact Approval Packet Preflight
```

CM-1707 prepared a future approval packet candidate shape while keeping
approval and runtime unauthorized. CM-1708 decides whether that candidate may
enter human exact-approval review, without issuing or generating approval.

## 4. One Capability

Add a fixture-only approval packet review boundary helper:

```text
src/core/VcpToolBoxStage02ExactApprovalPacketReviewBoundary.js
```

The helper accepts caller-provided sanitized summaries and returns one of:

- `exact_approval_packet_review_ready`
- `blocked_needs_exact_approval_packet_preflight`
- `blocked_needs_exact_approval_review_boundary`
- `blocked_needs_receipt_plan`
- `needs_plan_adjustment`

Review-ready means the future packet candidate may enter human review. It does
not mean an approval line exists, approval was granted, live execution happened,
runtime readiness exists, VCPToolBox compatibility was proven, or complete V8
is ready.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - .colameta/prompts/v1.7.0.md
  - src/core/VcpToolBoxStage02ExactApprovalPacketReviewBoundary.js
  - tests/vcp-toolbox-stage02-exact-approval-packet-review-boundary.test.js
  - docs/CM1708_VCPTOOLBOX_STAGE02_EXACT_APPROVAL_PACKET_REVIEW_BOUNDARY.md
  - docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
  - docs/taskbooks/versions/stage-02/VERSION_STAGE_02_V1_7_CM1708_EXACT_APPROVAL_PACKET_REVIEW_BOUNDARY.md
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
- approval-line generation, issue, consume, storage, or value exposure;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-stage02-exact-approval-packet-review-boundary.test.js
node --test tests/vcp-toolbox-stage02-exact-approval-packet-review-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- CM-1707 packet preflight is required;
- CM-1705 future execution boundary is required;
- CM-1704 receipt plan is required;
- packet candidate is future-only, exact-approval-required, and preflighted;
- human exact approval is still required;
- approval grant and approval-line generation remain forbidden;
- current review actions and budgets remain zero-runtime;
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
