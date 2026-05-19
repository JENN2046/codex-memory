# P66 A5-GAP-1 Read Policy Audit Evidence Approval Packet

Phase: `P66-a5-gap1-read-policy-audit-evidence-approval-packet`

Mode: `A5 preflight packet only`

Risk: `A5-preflight`

Decision: `DRAFT_NOT_APPROVED`

## Purpose

This packet narrows the remaining `governance_read_policy_no_recent_audit_evidence` limitation into one minimal approval scenario.

It is not authorization. It does not execute `governance:report`, read new runtime stores, write durable memory, write durable audit, enable read-policy config, mutate config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, execute cutover, or claim `RC_READY`.

## Current Git Reality

At packet creation time:

```text
branch = main
local HEAD = 7b70efc docs: refresh p66 gap6 after read policy rerun
origin/main = a9177d5 fix: tighten review patch safety semantics
ahead = 27 local commits
```

Exact branch, commit, ahead/behind state, and worktree cleanliness must be rechecked immediately before any approved A5 execution.

## Background

The latest approved read-only governance report rerun is [P66_A5_GAP_1_GOVERNANCE_READ_POLICY_RERUN_EVIDENCE.md](/A:/codex-memory/docs/P66_A5_GAP_1_GOVERNANCE_READ_POLICY_RERUN_EVIDENCE.md). It narrowed the old `readPolicy.status=unavailable` state into:

```yaml
readPolicy.status: config_only_no_recent_audit
readPolicy.source: config-only-no-recent-audit
configEvidenceAvailable: true
auditEvidenceAvailable: false
readPolicyConfigured: false
recentReadPolicyAuditCount: 0
```

That is better evidence, but not production governance readiness. The remaining limitation is not that read-policy evidence is invisible; it is that recent read-policy audit evidence is absent.

## Minimal Scenario

The minimal next A5 scenario is a read-only governance report rerun scoped to the read-policy audit evidence surface. It may observe whether a recent read-policy audit signal is present, but it must not create that signal.

Allowed command after approval:

```powershell
npm run governance:report -- --json
```

Allowed evidence fields:

```text
readPolicy.status
readPolicy.source
readPolicy.configEvidenceAvailable
readPolicy.auditEvidenceAvailable
readPolicy.readPolicyConfigured
readPolicy.recentReadPolicyAuditCount
readPolicy.recentReadPolicyAppliedCount
readPolicy.recentLifecyclePolicyAppliedCount
readPolicy.recentHiddenByLifecycleCount
readPolicy.recentStaleResultCount
summary.status
review.status
review.reviewLevel
```

Raw local database paths, raw workspace ids, raw memory text, provider keys, secret-like fragments, and unrelated record content must not be copied into the evidence document.

## Approval Line

Use this exact line to authorize the scenario:

```text
I approve A5-GAP-1 for codex-memory on branch main at commit 7b70efce7972dcda8b5c9fc11304f612ed9d7152, limited to p66-a5-gap1-read-policy-audit-evidence-readonly sanitized report, with durable write no, running read-only governance report only.
```

Any broader wording is treated as insufficient. Approval for this packet does not approve durable write, synthetic audit creation, read-policy enablement, config change, watchdog/startup work, migration/import/export/backup/restore, provider call, public MCP expansion, push/tag/release/deploy, A5-GAP-6 aggregation, A5-GAP-7, cutover, or `RC_READY`.

## Required Preflight

Before execution, verify:

```powershell
git status -sb
git rev-parse HEAD
git diff --stat
git diff --check
```

Required match:

```text
branch = main
HEAD = approved commit
tracked worktree = clean before execution
```

## Required Evidence Document

If later approved and executed, record a new evidence document with:

```yaml
approvedUnit: A5-GAP-1
approvedSubject: p66-a5-gap1-read-policy-audit-evidence-readonly sanitized report
durableWrite: false
command: npm run governance:report -- --json
destructive: false
mutated: false
noProvider: true
rawWorkspaceIdExposed: false
readPolicyStatus: <observed>
configEvidenceAvailable: <observed>
auditEvidenceAvailable: <observed>
readPolicyConfigured: <observed>
recentReadPolicyAuditCount: <observed>
productionGovernanceReady: false
runtimeReady: false
finalRcMatrixReady: false
rcReady: false
decision: NOT_READY_BLOCKED
```

## Stop Conditions

Stop without writing evidence if:

- branch or commit does not match the approval line
- tracked worktree is dirty before execution
- command output exposes secrets or raw memory content beyond the approved fields
- the command attempts durable memory/audit write
- the command requires config/watchdog/startup mutation
- the command requires provider calls
- the command requires migration/import/export/backup/restore
- the result tries to claim production governance readiness, runtime readiness, cutover readiness, or `RC_READY`

## Current Result

```yaml
approvalPacketCreated: true
approvalGranted: false
runtimeActionExecuted: false
durableWriteExecuted: false
readPolicyAuditEvidenceObserved: false
productionGovernanceReady: false
runtimeReady: false
finalRcMatrixReady: false
rcReady: false
decision: NOT_READY_BLOCKED
```
