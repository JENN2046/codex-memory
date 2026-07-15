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
executor_blob_oid: "27754872cdc14ed16639d1b80feef69104dea6f3"
executor_sha256: "cb75a18245dc3a61da17650b0d38611532947d07804792f49ec4b2985fdd1544"
```

The later hidden-untracked worktree check likewise changed the CM-2125 content
decision generator after the consumed decision had already been frozen. The
historical decision accurately binds the generator that created it:

```yaml
historical_content_generator_blob_oid: "df5ba8aecfa34fd3542982888c8b5fdc36e5104b"
historical_content_generator_bytes: 6015
historical_content_generator_sha256: "5bf077e5ad51315c0f266a6989653850f5d5d28da355ad56109b1522ab81bc57"

current_content_generator_blob_oid: "74508b4dab93b80c110148a86d9781af2a4a7020"
current_content_generator_bytes: 6197
current_content_generator_sha256: "fb442ed2eb2ec298bc7b15da530239fd691327e843b81042898213db303ab754"
```

The current generator forces `--untracked-files=all`; the historical generator
did not. Rebinding the already-consumed CM-2125 decision to the later generator
would misstate which bytes produced the authorized decision. The later
generator is hardened source for future packets only and carries no CM-2125 or
CM-2127 execution authority.

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
current_content_generator_authorized_by_cm2125: false
current_content_generator_execution_proof_accepted: false

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
