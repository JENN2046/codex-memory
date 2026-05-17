# P37 Policy Decision Envelope Fixture Matrix

Status: fixture-only / synthetic planning contract.

P37-T1 defines the first policy decision envelope matrix. It is not a runtime policy kernel, not recall integration, and not readiness for mainline cutover.

## Envelope

Each future decision envelope must carry:

- `decision_id`
- `policy_version`
- `decision`
- `machine_status`
- `reason_codes`
- `risk_label`
- `scope_metadata`
- `evidence_source`
- `failure_path`

Accepted decisions are `allow`, `deny`, and `require_review`.

## Fail-Closed Cases

- malformed envelope
- policy version mismatch
- missing reason codes
- warning-only critical gate
- A5 action request

All failure paths are nonzero. Redaction uncertainty is `require_review` and must not echo sensitive fragments.

## Isolation

P37-T1 decision fixtures do not enter:

- vector path
- candidate path
- diary path
- normal recall namespace
- projection path
- audit summary path

## Evidence

The committed fixture contract is [p37-policy-decision-envelope-v1.json](/A:/codex-memory/tests/fixtures/p37-policy-decision-envelope-v1.json).

The focused test is [p37-policy-decision-envelope-fixture.test.js](/A:/codex-memory/tests/p37-policy-decision-envelope-fixture.test.js).

## Non-Goals

P37-T1 does not:

- implement runtime policy enforcement
- connect to vector, candidate, diary, recall, projection, or audit summary paths
- read real memory content
- write durable memory or audit state
- expand public MCP tools or schemas
- call providers or models
- run migration/import/export/backup/restore
- claim v1.0 RC or runtime readiness
