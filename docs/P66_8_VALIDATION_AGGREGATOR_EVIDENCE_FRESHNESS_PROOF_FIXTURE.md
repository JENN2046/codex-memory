# P66.8 ValidationAggregator Evidence Freshness Proof Fixture

Phase: `P66.8-validation-aggregator-evidence-freshness-proof-fixture`

Mode: `A4.8 docs/fixture/test only`

Risk: `A1/A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Define fixture-only acceptance criteria for the second required evidence group under the first remaining ValidationAggregator gap:

```text
evidence_freshness_proof
```

This phase does not implement a runtime freshness collector, read evidence files, execute commands, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Fixture Contract

The fixture [p66-validation-aggregator-evidence-freshness-proof-v1.json](/A:/codex-memory/tests/fixtures/p66-validation-aggregator-evidence-freshness-proof-v1.json) defines the freshness proof contract for future work.

It locks:

- the selected evidence group id: `evidence_freshness_proof`
- required explicit freshness fields
- UTC ISO-8601 timestamp policy
- baseline commit binding policy
- source-class-specific freshness window policy
- low-risk summary restrictions
- fail-closed cases
- no-touch boundaries
- forbidden readiness claims

## Freshness Rules

Future proof work must require explicit evidence fields. Missing fields must fail closed, not be inferred.

Required fields:

- `evidence_id`
- `source_id`
- `source_kind`
- `source_registry_version`
- `baseline_commit`
- `evidence_generated_at`
- `evidence_validated_at`
- `evidence_observed_hash`
- `validation_status`
- `validation_ref`

Timestamp rules:

- timestamps must be UTC ISO-8601 with `Z`
- local timezone timestamps are not accepted
- implicit `now` is not accepted
- clock inference is not accepted
- generated-at must be before or equal to validated-at

Baseline rules:

- `baseline_commit` is required
- approval request commit is not the tested baseline
- ambiguous baseline fails closed
- baseline mismatch fails closed

Freshness window rules:

- freshness windows must be declared by evidence class
- there is no global default freshness window
- missing freshness window fails closed
- expired freshness window fails closed

## Low-Risk Summary Rules

Allowed low-risk summary fields are intentionally narrow:

- `evidence_id`
- `source_kind`
- `baseline_commit_short`
- `validation_status`
- `freshness_status`
- `age_bucket`
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

P66.8 is an acceptance fixture/test phase only.

Still false:

- `validationAggregatorFullImplementationReady`
- `runtimeReady`
- `finalRcMatrixReady`
- `v1RcReady`
- `rcReady`

Still blocked:

- runtime freshness collector
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

Result: `P66_8_EVIDENCE_FRESHNESS_PROOF_FIXTURE_DEFINED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.9-validation-aggregator-evidence-freshness-proof-helper
```

Chinese explanation: P66.9 can add a pure explicit-input helper for evidence freshness proof. It must not read evidence files, execute commands, start services, call providers, scan real memory, write durable state, or claim readiness.
