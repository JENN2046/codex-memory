# P66 A5-GAP-1 Read Policy Audit Writer Approval Packet

Phase: `P66-a5-gap-1-read-policy-audit-writer-approval-packet`

Mode: `A5 preflight packet only`

Risk: `A5-durable-read-policy-audit-write-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

This packet narrows the next `A5-GAP-1` action to the smallest durable read-policy audit evidence write that can close the current `governance_read_policy_no_recent_audit_evidence` limitation.

It is not authorization by itself. It does not execute `governance:report`, write durable audit records, write memory records, scan real memory, call providers, expand public MCP tools, run migrations, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Context

Latest approved read-only evidence:

- [P66_A5_GAP_1_READ_POLICY_AUDIT_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_READ_POLICY_AUDIT_EVIDENCE.md)
- [P66_A5_GAP_6_POST_READ_POLICY_AUDIT_VALIDATION_AGGREGATOR_EVIDENCE_EVALUATION.md](/A:/codex-memory/docs/P66_A5_GAP_6_POST_READ_POLICY_AUDIT_VALIDATION_AGGREGATOR_EVIDENCE_EVALUATION.md)

Current observed limitation:

```yaml
readPolicy.status: config_only_no_recent_audit
readPolicy.source: config-only-no-recent-audit
readPolicy.configEvidenceAvailable: true
readPolicy.auditEvidenceAvailable: false
readPolicy.recentReadPolicyAuditCount: 0
runtimeEvidenceSummaryLocallyEvidencedGapCount: 9
runtimeEvidenceSummaryRemainingGapCount: 6
decision: NOT_READY_BLOCKED
```

Source behavior inspected:

- `governance:report` reads recent read-policy audit evidence from `config.recallLogPath`.
- A recent JSONL entry counts when it has `recallType: "read-policy"` or explicit `readPolicyApplied` / `lifecyclePolicyApplied` fields.
- `governance:report` itself is read-only and reports `mutated=false` / `migrationApplied=false`.

## Proposed Approval Unit

Unit:

```text
A5-GAP-1
```

Subject:

```text
p66-a5-gap1-read-policy-audit-writer-smoke sanitized test subject
```

Requested action:

```text
Write exactly one sanitized read-policy audit evidence record to the existing local recall audit JSONL path, then run read-only governance:report to confirm the read-policy audit evidence is observed.
```

Durable write intent:

```text
durable write yes
```

Allowed only if approved:

- verify branch `main` and exact approved commit
- identify the existing local `config.recallLogPath`
- append exactly one sanitized JSONL record with `recallType: "read-policy"`
- include only sanitized counters and booleans needed by `governance:report`
- run read-only `npm run governance:report -- --json` after the write
- record before/after scoped line-count and hash evidence for the one appended record
- record sanitized governance report fields only

Required sanitized record shape:

```json
{
  "recallType": "read-policy",
  "readPolicyApplied": true,
  "lifecyclePolicyApplied": true,
  "hiddenByLifecycleCount": 0,
  "staleResultCount": 0,
  "lifecycleColumnAvailable": true,
  "scopeWorkspacePresent": true,
  "source": "p66-a5-gap1-read-policy-audit-writer-smoke"
}
```

The implementation may add timestamp/id/hash fields if they are sanitized and do not expose raw memory content, workspace ids, secrets, or local private content.

Not allowed:

- durable memory write
- raw memory content read, preview, scan, import, export, or migration
- provider/model call
- public MCP tool expansion
- config/watchdog/startup change
- SQLite schema migration
- import/export/backup/restore apply
- push, tag, release, deploy, RC cutover, or `RC_READY` claim

## Required Evidence After Execution

The execution evidence must record:

| Field | Requirement |
|---|---|
| `approvalUnit` | `A5-GAP-1` |
| `approvedSubject` | exact sanitized subject from the approval line |
| `approvedCommit` | exact commit from the approval line |
| `durableWrite` | `true` |
| `durableReadPolicyAuditWritten` | `true` only if exactly one sanitized read-policy audit record was written |
| `durableMemoryWritten` | `false` |
| `auditDestination` | sanitized local recall audit destination identifier, not raw path if sensitive |
| `appendedLineCount` | `1` |
| `auditRecordHash` | hash or equivalent integrity proof for the sanitized appended record |
| `rawContentOutput` | `false` |
| `providerCalled` | `false` |
| `publicMcpExpanded` | `false` |
| `remoteWritten` | `false` |
| `governanceReportExecuted` | `true` only for read-only `npm run governance:report -- --json` after append |
| `readPolicy.status` | expected `ok` if the appended record is observed |
| `readPolicy.auditEvidenceAvailable` | expected `true` if the appended record is observed |
| `readPolicy.recentReadPolicyAuditCount` | expected `>= 1` |
| `rcReadyClaimed` | `false` |

## Stop Conditions

Stop without writing if:

- branch or `HEAD` differs from the approval line
- the approved subject differs from this packet subject
- preflight shows unrelated dirty tracked worktree changes
- the recall audit destination cannot be identified before execution
- the action would write memory records instead of only a sanitized read-policy audit JSONL record
- more than one durable audit record would be written
- the write would require provider calls, migration, config/startup/watchdog changes, public MCP expansion, or remote actions
- command output would expose raw private memory content, raw workspace ids, local private paths beyond sanitized identifiers, or secrets

## Approval Line

Use the post-packet commit hash:

```text
I approve A5-GAP-1 for codex-memory on branch main at commit <POST_PACKET_COMMIT>, limited to p66-a5-gap1-read-policy-audit-writer-smoke sanitized test subject, with durable write yes, writing exactly one sanitized read-policy audit evidence record only, then running read-only governance:report.
```

Any missing field, broader subject, different branch, different commit, or ambiguous durable-write wording is not approved.

## Expected Result Boundary

If approved and executed successfully, the result may prove:

```text
read-policy audit evidence is observable by governance:report after one sanitized subject-bound audit record append
```

It still must not claim:

- durable memory writer readiness
- complete production governance readiness
- migration/backfill readiness
- final RC readiness
- v1.0 RC readiness
- cutover readiness
- `RC_READY`
