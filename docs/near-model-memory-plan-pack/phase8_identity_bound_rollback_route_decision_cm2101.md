# CM-2101 Route B Selection Decision Record

决定日期：2026-07-11

```yaml
result: PASS_AUDIT_ROUTE_B_SELECTED
decision_reference: "CM-2101-ER-20260711-HISTORICAL-BINDING-NOT-FOUND-ROUTE-B-SELECTED-E5CFF2D2"

historical_audit_accepted: true
historical_store_authority_evidence_found: false
cm2094_original_store_continuity_proven: false

cm2100_closed: true
route_a_selected: false
route_b_selected: true

rollbackDrillPassed: false
failureRecoveryProofPassed: false
phase8Completed: false
```

该决定正式终止追认 CM-2094 原 store 的路线。CM-2094 write receipt 继续保留，
但不再作为 rollback target。

## Route B identity

```yaml
lifecycle_reference: "phase8-identity-bound-rollback-lifecycle-001"
store_reference: "phase8-identity-bound-synthetic-rollback-store-001"
store_role: "phase8_identity_bound_synthetic_rollback_store"
synthetic_only: true

identity_present_before_first_native_write_required: true
identity_replacement_allowed: false
identity_reinitialization_allowed: false
physical_delete_allowed: false
```

不得复用 CM-2094 的 authorization decision、nonce、receipt ID、registry claim、
record target 或 execution packet。

## Required sequence

```text
identity bootstrap
→ bootstrap receipt review
→ empty-store read-only preflight
→ new synthetic record write authorization and execution
→ write receipt review
→ independent tombstone authorization and execution
→ rollback receipt review
→ Completion Audit application
```

每一道 gate 相互独立，前一道 gate 通过不授权后一道 gate。

## CM-2102 allowed scope

```yaml
new_lifecycle_contract_may_be_prepared: true
store_identity_template_may_be_frozen: true
bootstrap_request_may_be_prepared: true
empty_store_preflight_contract_may_be_implemented: true
future_write_packet_design_may_begin: true

store_identity_may_be_created_now: false
record_memory_may_execute_now: false
tombstone_memory_may_execute_now: false
verify_may_execute_now: false
nonce_may_be_claimed_now: false
```

CM-2102 只能形成非执行 foundation。任何 physical store、identity、runtime、native
action 或 receipt 状态必须继续为零/false。
