# Version Stage 02 v1.10 - CM-1711 Exact Approval Request Packet Review Readiness Boundary

```yaml id="version-stage-02-v1-10-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_reference: docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
version_id: CM-1711
version_label: stage-02-v1.10
version_name: Stage 02 Exact Approval Request Packet Review Readiness Boundary
created_at: 2026-07-03
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.9.0 / CM-1710
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only exact approval request packet review-readiness boundary
runtime_authorization: not_granted
approval_line_authorization: not_granted
approval_line_generation: forbidden
approval_line_template: forbidden
request_packet_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction by ensuring a future exact approval
request packet can be reviewed safely before any approval-line material or
runtime permission exists.

It does not expand the Master goal and does not authorize runtime execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
```

Stage 02 prepares exact approval readiness. CM-1711 handles only
review-readiness for the future exact approval request packet after CM-1710
skeleton preparation.

## 3. Prior Version Reference

Prior Version:

```text
v1.9.0 / CM-1710 - Stage 02 Exact Approval Request Packet Skeleton Boundary
```

CM-1710 prepared a non-authorizing future request packet skeleton. CM-1711 may
proceed only from that accepted skeleton and still does not grant approval.

## 4. One Capability

Add a fixture-only review-readiness helper:

```text
src/core/VcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary.js
```

The helper accepts caller-provided sanitized summaries and returns one of:

- `exact_approval_request_packet_review_ready`
- `blocked_needs_exact_approval_request_packet_skeleton`
- `blocked_needs_exact_approval_decision_intake`
- `blocked_needs_exact_approval_packet_review_boundary`
- `blocked_needs_exact_approval_packet_preflight`
- `blocked_needs_exact_approval_request_review_boundary`
- `blocked_needs_receipt_plan`
- `needs_plan_adjustment`

Review-ready means only that a future exact approval request packet may be
presented for human review. It does not mean approval was granted, an approval
line exists, runtime authorization exists, VCPToolBox compatibility was proven,
or complete V8 is ready.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - .colameta/prompts/v1.10.0.md
  - src/core/VcpToolBoxStage02ExactApprovalRequestPacketReviewReadinessBoundary.js
  - tests/vcp-toolbox-stage02-exact-approval-request-packet-review-readiness-boundary.test.js
  - docs/CM1711_VCPTOOLBOX_STAGE02_EXACT_APPROVAL_REQUEST_PACKET_REVIEW_READINESS_BOUNDARY.md
  - docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
  - docs/taskbooks/versions/stage-02/VERSION_STAGE_02_V1_10_CM1711_EXACT_APPROVAL_REQUEST_PACKET_REVIEW_READINESS_BOUNDARY.md
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
- approval-line validation, generation, issue, consume, storage, template
  inclusion, or value exposure;
- runtime authorization or readiness claim;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-stage02-exact-approval-request-packet-review-readiness-boundary.test.js
node --test tests/vcp-toolbox-stage02-exact-approval-request-packet-review-readiness-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-request-packet-skeleton-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-decision-intake-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-packet-review-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- CM-1710 request packet skeleton is required;
- CM-1709 `approve_requested` intake is required;
- `reject` and `needs_adjustment` routes are rejected for review-readiness;
- CM-1708 review boundary is required;
- CM-1707 packet preflight is required;
- CM-1705 future execution boundary is required;
- CM-1704 receipt plan is required;
- request review packet is non-authorizing, review-readiness-only,
  low-disclosure, and contains required audience, scope, risk, abort,
  validation, receipt, expiry, single-use, and boundary references only as
  presence flags;
- approval-line validation, generation, issue, consume, storage, template
  inclusion, and value exposure all fail closed;
- current request-review actions and budgets remain zero-runtime;
- future runtime actions remain CM-1705-bound;
- unsafe fields, runtime authorization, approval-line values/templates,
  budget/counter expansion, readiness, release, deploy, push, and complete V8
  claims fail closed;
- validation passes or a precise blocker is recorded;
- no forbidden work was performed or implied.

## 9. Closeout Question

Every closeout must answer exactly:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, report `needs_plan_adjustment`; do not mark complete
by assumption.
