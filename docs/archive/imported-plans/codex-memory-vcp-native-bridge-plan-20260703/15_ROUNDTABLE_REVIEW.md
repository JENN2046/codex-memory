# Roundtable Review

## Participants

- Principal Architect
- Security Auditor
- Memory Governance Reviewer
- VCPToolBox Integration Reviewer
- Codex Runtime Reviewer
- AGENTS OS Commander
- Product / Workflow Reviewer
- Skeptical Reviewer

## Debate

### Principal Architect

The new strategy is architecturally correct. VCPToolBox should own memory intelligence; codex-memory should not spend its primary roadmap cloning DeepMemo, TopicMemo, or TagMemo. The immediate problem is not lack of features but inconsistent source-of-truth. M0-M2 must precede live invocation.

### Security Auditor

The L0-L3 autonomy model is acceptable only because L4 is strict. No live VCP call, raw private runtime read, secrets, broad scans, irreversible deletion, runtime config mutation, provider/API call, or readiness claim should self-approve. Observe-lite must not become a memory read.

### Memory Governance Reviewer

The plan correctly separates boundary approval from routine per-call approval. Codex-memory should self-review and self-approve inside approved boundaries. However, every operation needs a receipt, and fallback must be visibly marked so local memory is not mistaken for VCP-native success.

### VCPToolBox Integration Reviewer

Do not assume VCPToolBox exposes the surfaces exactly as docs suggest. The inventory phase must classify DailyNote, KnowledgeBase, TagMemo, LightMemo, DeepMemo, TopicMemo, MeshMemo, and RAGDiaryPlugin as verified/inferred/unresolved. Live proof should start with observe-lite only after exact target binding.

### Codex Runtime Reviewer

Codex and Claude should never bypass the governed MCP path. The public tool surface should not expand early. Client_id, scope, and visibility must be part of the request normalization and audit receipt from the beginning.

### AGENTS OS Commander

The first three tasks must be reality calibration, strategy pivot, and documentation source-of-truth synchronization. AGENTS OS needs autonomous progress inside boundaries, so avoid per-call Jenn confirmation. But no live VCP proof starts until the route and state files are aligned.

### Product / Workflow Reviewer

The end-user value is sustained workflow memory for Codex and Claude. That should come after read-shape proof and receipts, not before. Checkpoint and handoff memory should be introduced as governed workflow features, not as uncontrolled writes.

### Skeptical Reviewer

The repository still contains old route language and stale state files. It is unsafe to build live VCP calls on top of inconsistent docs. The plan is only valid if it refuses to call fixture-only tests live proof and refuses to claim RC/production.

## Agreements

- New strategy is correct.
- codex-memory should stop treating VCP memory reimplementation as the primary route.
- Local memory should remain as fallback/audit/test/compatibility.
- L0-L3 auto and L4 strict is the right authorization shape.
- M0-M2 must be first.
- Live observe-lite is useful but should be deferred until exact boundary approval.
- Durable write ability should be delayed.

## Disagreements

- Whether to archive or split `VCP_MEMORY_PARITY_ROADMAP.md`.
  - Final decision: do not delete; downgrade and split by creating a new primary bridge roadmap while retaining old material as fallback/compatibility reference.
- Whether package metadata should change early.
  - Final decision: docs first; package metadata only as a later M2 metadata sync if it does not alter runtime scripts.

## Objections and counterarguments

| Objection | Counterargument | Decision |
|---|---|---|
| “Local parity work is already advanced; keep it primary.” | New strategy explicitly assigns intelligence to VCPToolBox. Local work remains fallback/test. | Reject primary parity route |
| “Start observe-lite immediately.” | State/docs drift and exact boundary templates are not yet aligned. | Defer to M6 |
| “Jenn should approve each memory call.” | AGENTS OS requires boundary-level autonomy. | Reject per-call manual model |
| “Auto writes should be enabled soon.” | Writes are highest risk and require proposal mode plus exact write boundary. | Defer to M9/M10 |

## Roundtable result

```yaml
roundtable_result:
  accepted:
    - VCP-native-first governed memory bridge is the primary route
    - VCPToolBox owns memory intelligence
    - codex-memory owns memory governance
    - local memory remains fallback/audit/test/compatibility
    - L0-L3 auto within approved boundary
    - L4 strict hard stop
    - M0-M2 first
  rejected:
    - primary VCP memory reimplementation/parity clone roadmap
    - routine per-call Jenn confirmation
    - fixture-only or approval-display gate as live proof
    - production/release/cutover claim
  amended:
    - VCP_MEMORY_PARITY_ROADMAP becomes legacy/fallback/compatibility reference
    - new primary bridge roadmap should be created
    - observe-lite split from read-shape proof
  deferred:
    - live VCP observe-lite proof
    - observe-full read proof
    - trusted-full-read workflow
    - durable writes/update/supersede/tombstone
    - public MCP expansion
    - RC gate
  requires_jenn_boundary_approval:
    - new runtime target
    - live VCP call
    - new client_id authority
    - scope or visibility expansion
    - read-only to read-write upgrade
    - first durable write
    - production/release/cutover readiness claim
  requires_repository_reality_check:
    - fresh git HEAD/origin/dirty status
    - STATUS/CURRENT_STATE/TASK_QUEUE sync
    - README/roadmap route sync
  unresolved:
    - exact VCPToolBox target transport
    - exact auth/approval path
    - actual live memory result shape
    - whether all named VCP memory surfaces are accessible through approved runtime
  final_decision: proceed with M0-M2 first, then M3 inventory and approval templates; do not start live VCP work until exact boundary approval exists
```
