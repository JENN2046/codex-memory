# Future Phases M9-M15 — Entry / Exit Conditions and Risks

## M9 — Governed Mutation Proposal Mode

```yaml
entry_conditions:
  - M8 trusted-full-read workflow evidence exists
  - mutation proposal envelope is specified
  - L4 hard-stop shield is tested for write intent
exit_conditions:
  - proposal can be generated, accepted, rejected, and audited without durable write
  - proposal receipt includes rollback posture and scope
risks:
  - proposal mistaken for durable write
  - write authority implied by docs
freeze_judgment:
  - do not execute durable writes in M9
```

## M10 — Bounded Autonomous Write / Update / Supersede / Tombstone

```yaml
entry_conditions:
  - M9 proposal mode passed
  - Jenn exact write boundary approval exists
  - target, client_id, scope, visibility, and rollback posture are explicit
exit_conditions:
  - one bounded mutation family passes with audit receipt
  - update/supersede/tombstone are reversible or tombstone-based where possible
  - no cross-client leakage or irreversible deletion
risks:
  - highest safety risk phase
  - accidental durable write beyond boundary
freeze_judgment:
  - no write work before exact approval and proposal mode
```

## M11 — Response Normalization + Audit Receipts

```yaml
entry_conditions:
  - M4 contract exists
  - M7 read shape is known or explicitly simulated
exit_conditions:
  - VCP-native and fallback responses share a normalized envelope
  - receipts are low-disclosure and stable
risks:
  - normalization hides safety-critical details
  - raw private output leaks in debug fields
```

## M12 — Codex / Claude Sustained Workflow Integration

```yaml
entry_conditions:
  - M8 read-only workflow harness exists
  - client_id/scope/visibility matrix exists
exit_conditions:
  - Codex and Claude workflows use governed MCP only
  - checkpoint/handoff memory receipts are auditable
  - private memories remain isolated
risks:
  - cross-client leakage
  - stale context propagation
```

## M13 — Fallback Local Memory Hardening

```yaml
entry_conditions:
  - local fallback role contract exists
  - policy shield applies to fallback
exit_conditions:
  - fallback recall/write dry-runs obey scope/client/visibility
  - fallback result is clearly marked
  - secret/lifecycle/query-quality tests are green
risks:
  - fallback becomes primary route by inertia
  - local parity work consumes bridge roadmap
```

## M14 — Observability / Dashboard / Health Report

```yaml
entry_conditions:
  - receipt schema stable
  - normalized outputs stable
exit_conditions:
  - health report shows policy, target, fallback, query quality, and receipt status
  - dashboard contains no raw private memory or secrets
  - readiness labels are accurate and conservative
risks:
  - dashboard overclaims readiness
  - logs leak private content
```

## M15 — Release Candidate Gate / v1 Stable Bridge

```yaml
entry_conditions:
  - M0-M14 evidence complete
  - no P0/P1 open risk
  - docs match runtime evidence
  - dedicated Jenn approval for RC review exists
exit_conditions:
  - RC gate report can be considered
  - no tag/release/deploy/cutover performed
  - production/release/cutover claims remain withheld unless separately approved
risks:
  - pressure to convert candidate gate into release
  - fixture-only evidence mistaken for runtime proof
freeze_judgment:
  - this package does not authorize RC, release, production, or cutover
```
