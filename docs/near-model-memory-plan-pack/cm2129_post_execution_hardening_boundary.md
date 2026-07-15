# CM-2129 Post-execution Hardening Boundary

This addendum keeps the Branch CAS execution evidence and the later source
hardening separate.

The CM-2126 packet, CM-2127 final release, CM-2128 receipts, and CM-2129 receipt
review are historical evidence for the executor that actually performed the
single consumed Branch CAS. That executor is bound to:

```yaml
implementation_commit: "d0229597e78d72de908968b6e92ff6734d26ec9d"
executor_blob_oid: "17f0c19dd94270c9d9c41e3222b86ab601703c3c"
executor_sha256: "38fb8b7b320bc372443a7ad300295c63f628b0daa8f5b6b910aecab719c5212c"
```

The post-execution `reference-transaction` hook hardening changed the shipped
executor source to:

```yaml
executor_blob_oid: "e24a81285ce89a272d31587108b5a54f2f981f04"
executor_sha256: "5e27a9b9840bf7a16ec6dcc1300135c685941378df6350fa2ab94e38dc7ccec6"
```

The historical decision and receipts must not be rewritten to name the later
blob: doing so would falsely claim that different bytes performed an already
consumed ref transition. The exact current boundary is:

```yaml
historical_branch_cas_receipt_preserved: true
historical_authorization_consumed: true
historical_authorization_replay_allowed: false

current_shipped_executor_authorized_by_cm2127: false
current_shipped_executor_execution_proof_accepted: false
current_shipped_executor_branch_cas_may_execute: false

additional_branch_ref_update_authorized: false
remote_action_authorized: false
readiness_claimed: false
```

Any future execution proof for the hardened executor requires a new versioned
content decision, implementation packet, final release, nonce, receipt, target
transition, execution receipt, and independent review. The consumed
`869d9d6e… -> eb016872…` transition and its CM-2125 nonce/receipt cannot be
replayed or relabeled. This addendum performs no ref update, remote action,
native-memory action, release, deploy, cutover, or readiness action.
