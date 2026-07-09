# Approval and Autonomy Model

## Policy name

```yaml
memory_approval_policy:
  mode: bounded_autonomous_approval
```

## L0-L3 auto-approved boundary

Within an approved runtime target, approved client_id authority, approved scope, approved visibility, and approved profile, codex-memory may self-review, self-approve, and execute:

```yaml
auto_approved_inside_boundary:
  - VCP-native read recall
  - local fallback recall
  - governed memory write when write profile is already approved
  - memory update when write profile is already approved
  - supersession when write profile is already approved
  - tombstone when write profile is already approved and reversible/auditable
  - checkpoint memory
  - handoff memory
  - audit receipt
  - result normalization
  - query quality validation
  - rollback-ready dry-run
```

## L4 hard stops

codex-memory must stop and not self-approve when any of these appear:

```yaml
hard_stop_l4:
  - secret access
  - token / credential / cookie / .env access
  - raw private runtime read
  - raw private memory read without exact approval
  - unbounded memory scan
  - cross-client private leakage
  - irreversible deletion
  - runtime config mutation
  - provider/API call without exact approval
  - startup / watchdog / service mutation without exact approval
  - deploy / release / push / tag / PR / merge
  - production-ready / release-ready / cutover-ready claim without dedicated approval
  - unknown target
  - unclear authority
```

## Jenn-required boundary expansion

Jenn approval is required for:

```yaml
jenn_required:
  - new runtime target
  - new VCPToolBox transport
  - new client_id authority
  - scope expansion
  - visibility expansion
  - read-only to read-write profile upgrade
  - first live VCP observe-lite proof
  - first live read-shape proof
  - first trusted-full-read workflow harness
  - first durable VCP write
  - public MCP tool expansion
  - broad store scan / import / export / migration / backfill
  - production readiness claim
  - release readiness claim
  - cutover readiness claim
```

## Audit requirements

Every governed operation must produce a low-disclosure receipt:

```yaml
audit_receipt:
  required_fields:
    - receipt_id
    - timestamp
    - client_id
    - scope
    - visibility
    - operation_type
    - runtime_target_alias
    - profile
    - approval_boundary_id
    - l4_preflight_result
    - self_review_result
    - action_summary
    - output_disclosure_level
    - fallback_used
    - stop_condition_triggered
    - rollback_posture
  must_not_include:
    - raw secrets
    - raw credentials
    - raw private runtime state
    - unredacted private memory payload
    - raw provider payload
```

## Balance judgment

This model avoids per-call manual confirmation for routine memory work while preserving hard stops for authority expansion, private leakage, destructive operations, and runtime-sensitive actions.
