# CM-1674 Record Memory Approval Packet Expiry / Commit Binding Negative Cases

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_APPROVAL_PACKET_EXPIRY_COMMIT_BINDING_NEGATIVE_CASES_FIXTURE_ONLY`

## Scope

Add fixture-only negative coverage for approval packet expiry and target commit binding.

Changed:

- `src/core/RecordMemoryProductionStrictAuthApprovalPacket.js`
- `tests/record-memory-production-strict-auth-approval-packet.test.js`

## Contract Added

The helper now accepts an optional fixture-only `expectedTargetCommit` validator option.

If supplied, `packet.target_commit` must match `expectedTargetCommit` case-insensitively. Mismatch fails closed with `target_commit` in `invalidFields`.

Existing expiry handling remains fail-closed when `expires_at` is stale relative to `now`.

## Boundary

This does not execute rollout, inspect live Git internally, read `.env`, call providers, wire runtime behavior, deploy, or enable strict auth. The caller remains responsible for supplying fresh Git facts.

## Validation

```text
node --test tests\record-memory-production-strict-auth-approval-packet.test.js
```
