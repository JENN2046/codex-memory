# Self-review

## 1. Does this plan serve the new strategy?

Yes. The plan places VCPToolBox as memory intelligence owner and codex-memory as governance bridge. Local memory is downgraded to fallback/audit/compatibility/test substrate.

Amendment applied: M0-M2 are first; live VCP proof and write proof are delayed.

## 2. Does it secretly preserve VCP clone inertia?

Risk identified: legacy parity documents and uploaded earlier review still steer toward local VCP practical parity.

Amendment applied: VCP parity roadmap is downgraded to fallback/legacy compatibility reference; a new VCP-native bridge roadmap becomes primary.

## 3. Is it too dependent on Jenn manual approval?

No. The model uses boundary approval, not per-call approval. L0-L3 routine calls inside an approved boundary are self-reviewed, self-approved, and executed.

Amendment applied: taskbooks explicitly require Jenn only for boundary expansion, new target, live proof, write profile upgrade, and readiness claims.

## 4. Is it too permissive?

The main risk is durable mutation. The plan delays write/update/supersede/tombstone until M9 proposal mode and M10 exact write boundary approval.

Amendment applied: L4 hard stops are repeated in phase plans and taskbooks.

## 5. Does it assume VCPToolBox capabilities?

No runtime capability is treated as proven. VCP surfaces are inventoried in M3 and proven progressively in M6/M7/M8.

Amendment applied: every VCP capability must be tagged verified/inferred/assumed/unresolved.

## 6. Does it include fallback / rollback / audit?

Yes. Local fallback contract is M3-T3, fallback hardening is M13, audit receipts are required from M4 onward, rollback posture is required for mutation and migration.

## 7. Does it include Codex / Claude multi-client isolation?

Yes. Client_id, scope, and visibility rules are in the core architecture, approval model, M5, M8, M12, and P0 risk register.

## 8. Does it include STATUS / taskbook / roadmap synchronization?

Yes. This is the purpose of M2 and the first three executable tasks.

## 9. What should be earlier or later?

Earlier:

- repository reality calibration;
- strategy pivot decision;
- README/STATUS/taskboard/roadmap sync;
- VCP capability inventory.

Later:

- observe-lite live proof;
- observe-full read proof;
- trusted-full-read harness;
- write proposal;
- bounded writes;
- production/RC.

## 10. Which phases should merge or split?

Kept split:

- M1 strategy pivot and M2 docs sync remain separate because route decision and state synchronization have different risks.
- M6 observe-lite and M7 read shape remain separate because target proof is not read proof.
- M9 proposal and M10 durable write remain separate because proposal must not mutate.

Possible future merge:

- M11 normalization and M14 observability may merge if receipt schema is small.

## 11. Is there far-stage pseudo-precision?

Mitigated. M9-M15 are only entry/exit/risk and freeze judgments.

## 12. Does it mistake fixture-only / approval-only gates for live proof?

No. The validation strategy explicitly labels fixture, dry-run, approval display, observe-lite, read shape, trusted-full-read, and write proof as separate evidence types.

## Revised recommendation after self-review

Freeze first execution batch as M0-T1, M1-T1, M2-T1/M2-T2 family, with M0-T2 as a required prerequisite artifact. Do not run live VCP observe-lite until M0-M3 are accepted and exact Jenn boundary approval is provided.
