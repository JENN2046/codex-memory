# P66.12 ValidationAggregator Baseline Binding Proof Fixture

Phase: `P66.12-validation-aggregator-baseline-binding-proof-fixture`

Mode: `A4.8 docs/fixture/test only`

Risk: `A1/A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Define fixture-only acceptance criteria for the third required evidence group under the first remaining ValidationAggregator gap:

```text
baseline_binding_proof
```

This phase does not implement a runtime baseline collector, run Git checkout/reset/detach, perform remote baseline lookup, read evidence files, execute commands, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Fixture Contract

The fixture [p66-validation-aggregator-baseline-binding-proof-v1.json](/A:/codex-memory/tests/fixtures/p66-validation-aggregator-baseline-binding-proof-v1.json) defines the baseline binding proof contract for future work.

It locks:

- the selected evidence group id: `baseline_binding_proof`
- required explicit baseline binding fields
- separated commit roles
- accepted baseline kinds
- target/evidence subject equality
- approval request commit separation
- current main head separation
- temporary gate execution checkout semantics
- low-risk summary restrictions
- fail-closed cases
- no-touch Git boundaries
- forbidden readiness claims

## Baseline Rules

Future proof work must require explicit baseline fields. Missing fields must fail closed, not be inferred.

Required fields:

- `evidence_id`
- `baseline_binding_id`
- `target_commit`
- `target_commit_source`
- `baseline_kind`
- `baseline_ref`
- `evidence_subject_commit`
- `validation_scope`
- `binding_observed_at`
- `binding_status`

Separated commit roles:

- `target_commit` is the code or artifact commit being validated
- `approval_request_commit` is the approval document version, not automatically the target
- `execution_checkout_commit` is the temporary checkout or worktree commit used by future approved gates
- `current_main_head` is the active main branch state, not automatically the target

Policy rules:

- `target_commit` is required
- `target_commit` must equal `evidence_subject_commit`
- approval request commit is not target by default
- current main head is not target by default
- execution checkout commit is required only for approved gate execution
- fixture work does not require checkout
- fixture work does not require remote lookup
- no silent inference is allowed
- ambiguous baseline fails closed
- baseline mismatch fails closed

## Low-Risk Summary Rules

Allowed low-risk summary fields are intentionally narrow:

- `evidence_id`
- `baseline_binding_id`
- `target_commit_short`
- `baseline_kind`
- `binding_status`
- `mutated`

Low-risk summaries must not expose:

- raw workspace ids
- raw workspace paths
- raw secrets or tokens
- authorization headers
- provider keys
- absolute paths
- live service URLs

## Boundary Confirmation

P66.12 is an acceptance fixture/test phase only.

Still false:

- `validationAggregatorFullImplementationReady`
- `runtimeReady`
- `finalRcMatrixReady`
- `v1RcReady`
- `rcReady`

Still blocked:

- runtime baseline collector
- Git checkout/reset/detach
- remote baseline lookup
- evidence file reads
- command/gate/runner execution
- live HTTP operation
- provider calls
- real memory/runtime-store scans
- durable memory/audit writes
- migration/import-export/backup/restore apply
- public MCP expansion
- push/tag/release/deploy
- config/startup/watchdog mutation
- `RC_READY`

## Result

Result: `P66_12_BASELINE_BINDING_PROOF_FIXTURE_DEFINED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.13-validation-aggregator-baseline-binding-proof-helper
```

Chinese explanation: P66.13 can add a pure explicit-input helper for baseline binding proof. It must not checkout/reset/detach HEAD, run remote lookup, read evidence files, execute commands, start services, call providers, scan real memory, write durable state, or claim readiness.
