# P66 A5-GAP-1 Production Governance Readiness Read-Only Approval Packet

Phase: `P66-a5-gap-1-production-governance-readiness-readonly-approval-packet`

Mode: `A5 preflight packet only`

Risk: `A5-production-governance-readiness-readonly-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

This packet narrows the next step for the remaining limitation:

```text
production_governance_readiness_not_complete
```

The current approved evidence proves that the project has subject-bound governance-loop evidence, durable audit-writer smoke evidence, read-policy evidence surfaces, and one sanitized read-policy audit writer smoke observed by `governance:report`. The latest `A5-GAP-6` aggregation consumed those approved evidence records and still kept `NOT_READY_BLOCKED`.

This packet requests only a read-only production-governance readiness evidence scenario. It is not approval by itself.

## Current Evidence

- [P66_A5_GAP_1_GOVERNANCE_LOOP_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_GOVERNANCE_LOOP_EVIDENCE.md) records a subject-bound in-memory governance loop with durable write `false`.
- [P66_A5_GAP_1_DURABLE_AUDIT_WRITER_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_DURABLE_AUDIT_WRITER_EVIDENCE.md) records exactly one sanitized durable audit writer smoke with durable memory write `false`.
- [P66_A5_GAP_1_GOVERNANCE_READ_POLICY_RERUN_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_GOVERNANCE_READ_POLICY_RERUN_EVIDENCE.md) records read-policy config evidence with no recent audit evidence.
- [P66_A5_GAP_1_READ_POLICY_AUDIT_WRITER_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_READ_POLICY_AUDIT_WRITER_EVIDENCE.md) records exactly one sanitized read-policy audit evidence append followed by read-only `governance:report`, which observed `readPolicy.status=ok`, `auditEvidenceAvailable=true`, and `recentReadPolicyAuditCount=1`.
- [P66_A5_GAP_6_POST_READ_POLICY_AUDIT_WRITER_VALIDATION_AGGREGATOR_EVIDENCE_EVALUATION.md](/A:/codex-memory/docs/P66_A5_GAP_6_POST_READ_POLICY_AUDIT_WRITER_VALIDATION_AGGREGATOR_EVIDENCE_EVALUATION.md) records an evidence-only aggregation with locally evidenced count `10`, remaining count `6`, and readiness flags false.

## Proposed Approval Unit

Unit:

```text
A5-GAP-1
```

Subject:

```text
p66-a5-gap1-production-governance-readiness-readonly sanitized report
```

Requested action:

```text
Run one read-only governance report and produce one sanitized production-governance readiness evidence document.
```

Durable write intent:

```text
durable write no
```

Allowed only if the exact approval line is supplied:

- verify branch and exact commit
- verify tracked worktree state before execution
- run only this read-only command:

```powershell
npm run governance:report -- --json
```

- summarize only low-risk counts and status fields
- record whether production-governance readiness is still blocked
- produce one committed Markdown evidence report
- keep runtime/final-RC/v1-RC/cutover/RC readiness false unless every required production-governance condition is actually satisfied

## Not Allowed

- durable memory write
- durable audit write
- provider/model call
- real memory content scan, preview, import, export, or migration
- SQLite schema migration
- import/export/backup/restore apply
- public MCP tool expansion
- config/watchdog/startup change
- cutover or A5-GAP-7 action
- push, tag, release, or deploy
- raw memory content, raw workspace id, secret, token, cookie, path, or provider key exposure
- `RC_READY`, runtime readiness, final RC readiness, v1 RC readiness, or cutover readiness claim from partial evidence

## Required Evidence After Execution

| Field | Requirement |
|---|---|
| `approvalUnit` | `A5-GAP-1` |
| `approvedSubject` | exact sanitized subject from the approval line |
| `approvedCommit` | exact commit from the approval line |
| `durableWrite` | `false` |
| `governanceReportCommandApproved` | `true` only if approval line names read-only governance report |
| `governanceReportExecuted` | `true` only if the approved read-only command ran |
| `durableAuditWritten` | `false` |
| `durableMemoryWritten` | `false` |
| `realMemoryScanned` | `false` |
| `providerCalled` | `false` |
| `publicMcpExpanded` | `false` |
| `configChanged` | `false` |
| `migrationApplied` | `false` |
| `remoteWritten` | `false` |
| `rcReadyClaimed` | `false` |
| `readinessDecision` | one of `PRODUCTION_GOVERNANCE_READINESS_READONLY_PASSED_NOT_RC_READY` or `NOT_READY_BLOCKED` |
| `remainingGovernanceLimitations` | explicit list |

## Production Governance Readiness Conditions

The read-only evidence may mark the production-governance surface as locally acceptable only if all are true:

- `governance:report` exits successfully
- governance summary and review status are `ok`
- review level is no worse than nominal
- proposal, tombstone, supersession, stale, and read-policy signals do not require manual review
- read-policy evidence is explicit and recent
- no durable memory or durable audit write occurs
- no provider/config/watchdog/startup/migration/import/export/backup/restore/public-MCP/remote/cutover action occurs
- no raw private content, raw workspace id, or secret is exposed

Even if the read-only surface is locally acceptable, this packet still must not claim:

- ValidationAggregator full implementation complete
- runtime readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`

If any condition is missing, warning-only, stale, unavailable, or ambiguous, the decision must remain:

```text
NOT_READY_BLOCKED
```

## Stop Conditions

Stop without running the read-only command if:

- branch or `HEAD` differs from the approval line
- approval line omits the exact sanitized subject
- approval line omits `durable write no`
- approval line does not explicitly say `running read-only governance report only`
- worktree has unrelated dirty changes
- command behavior appears to mutate state, start services, call providers, or change config
- output cannot be summarized without exposing sensitive details

## Approval Line

Use the post-packet commit hash:

```text
I approve A5-GAP-1 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, limited to p66-a5-gap1-production-governance-readiness-readonly sanitized report, with durable write no, running read-only governance report only.
```

Any missing field, broader subject, different branch, different commit, durable write yes, provider/migration/cutover wording, or ambiguous readiness wording is not approved.
