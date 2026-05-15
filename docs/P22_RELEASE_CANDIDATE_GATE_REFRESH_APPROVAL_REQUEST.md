# P22 Release Candidate Gate Refresh Approval Request

Phase: `P22-release-candidate-gate-refresh-approval-request`

Status: `DRAFT_NOT_APPROVED`

Mode: `A5-approval-request-draft`

Risk: `A4`

## Purpose

Draft the exact approval request needed before any fresh release-candidate gate refresh is run.

This document is not approval. It does not authorize command execution. It does not create a release candidate.

This phase is docs/status/board only. It does not run `npm test`, `gate:ci`, compare / rollback suites, strict mainline gate, provider commands, live Claude commands, startup/watchdog commands, migration/import-export commands, release candidate creation, tag, release, or deploy.

## Requested Operation

Requested operation: fresh local release-candidate gate refresh for target commit `806cc847cb37a3e428099b45871a4f1a13c4fa6f`.

Exact target commit for this draft: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`.

Approval status: `NOT_APPROVED`.

Decision: `BLOCKED_HARD_STOP`.

## Required Approval Sentence

The user must explicitly approve with a sentence equivalent to:

```text
I explicitly approve the P22 release-candidate gate refresh for target commit 806cc847cb37a3e428099b45871a4f1a13c4fa6f, limited to the local non-provider commands listed in docs/P22_RELEASE_CANDIDATE_GATE_REFRESH_APPROVAL_REQUEST.md, with no live HTTP MCP startup, no release candidate creation, no config mutation, no startup/watchdog operation, no provider call, no real memory preview, no migration/import-export apply, no public MCP expansion, no tag, no release, and no deploy.
```

Do not treat the sentence above as approval while it appears in this draft.

## Proposed Scope

In scope after explicit approval:

- verify clean worktree and target commit
- run local docs validation
- run local full test suite
- run fixture-safe `gate:ci -- --json`
- run compare standard suite
- run rollback standard suite
- write a redacted gate refresh report

Out of scope:

- release candidate creation
- tag / release / deploy
- provider smoke / benchmark
- live Claude acceptance
- Codex / Claude config mutation
- live HTTP MCP startup
- startup or watchdog install
- HKCU Run edit
- SQLite migration / `ALTER TABLE`
- import/export apply
- real memory preview or durable memory write
- MCP schema or public tool expansion
- package / dependency changes

## Exact Gates To Run

These gates are proposed only. They must not be run until explicit approval is given.

| Gate | Exact command | Expected output |
|---|---|---|
| target verification | `git status --short --branch`; `git rev-parse HEAD`; `git rev-parse origin/main`; `git ls-remote origin refs/heads/main` | clean worktree; local HEAD, local `origin/main`, and remote `refs/heads/main` all equal `806cc847cb37a3e428099b45871a4f1a13c4fa6f` |
| diff hygiene | `git diff --check` | no whitespace errors |
| docs validation | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | `VALIDATION PASSED` |
| full local suite | `npm test` | all local tests pass |
| CI-safe fixture gate | `npm run gate:ci -- --json` | JSON summary `status=ok`, `mutated=false`, `providerCalls=0`, no durable memory touched |
| compare standard suite | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | all standard-suite cases matched |
| rollback standard suite | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | all standard-suite cases rollback-ready |

## Proposed Commands

These commands are the exact command list for the proposed gates. They must not be run until explicit approval is given.

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm test
npm run gate:ci -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

Strict mainline gate is excluded from this request because this draft does not authorize live HTTP MCP startup or runtime observation.

## Explicit Exclusion Answers

| Question | Answer |
|---|---|
| Exact target commit | `806cc847cb37a3e428099b45871a4f1a13c4fa6f` |
| May live HTTP MCP be started? | No. Live HTTP MCP startup is excluded. |
| Are provider commands excluded? | Yes. `provider-smoke` and `provider-benchmark` are excluded. |
| Is real memory preview excluded? | Yes. Real memory preview and broad durable memory reads are excluded. |
| Are tag/release/deploy excluded? | Yes. Tag, release, and deploy are excluded. |
| Is config mutation excluded? | Yes. Codex / Claude config mutation is excluded. |
| Is migration/import-export apply excluded? | Yes. SQLite migration, `ALTER TABLE`, import apply, and export apply are excluded. |
| Is public MCP expansion excluded? | Yes. MCP schema changes and public tool expansion are excluded. |

## Mutation Scope

| Surface | Planned value |
|---|---|
| Remote repository mutation | no |
| Release candidate creation | no |
| Branch/tag/release/deploy | no |
| Codex / Claude config mutation | no |
| Live HTTP MCP startup | no |
| Startup/watchdog operation | no |
| Provider call | no |
| Real memory preview | no |
| Durable memory / DB / diary write | no |
| SQLite migration / `ALTER TABLE` | no |
| Import/export apply | no |
| MCP schema/tool change | no |
| Package/dependency change | no |

If any command output indicates a mutation outside this table, stop and report `BOUNDARY_VIOLATION`.

## Expected Report Shape

Any future approved gate refresh should produce a redacted summary:

```json
{
  "status": "pass|fail|blocked",
  "targetCommit": "806cc847cb37a3e428099b45871a4f1a13c4fa6f",
  "mutated": false,
  "releaseCandidateCreated": false,
  "providerCalls": 0,
  "realConfigTouched": false,
  "liveHttpMcpStarted": false,
  "startupOrWatchdogTouched": false,
  "migrationOrImportExportTouched": false,
  "durableMemoryTouched": false,
  "gates": [],
  "blockers": [],
  "nextStep": "blocked-for-rc-implementation-approval"
}
```

## Stop Conditions

Stop immediately if:

- worktree is dirty before the gate run
- local `HEAD`, `origin/main`, and remote `refs/heads/main` do not match the approved target commit
- any command asks for provider credentials
- any command attempts config mutation
- any command attempts to start live HTTP MCP
- any command starts or installs startup/watchdog behavior outside explicit scope
- any command reads broad real memory content
- any command writes durable DB / diary / memory
- any migration/import-export apply behavior appears
- any secret-like output appears
- any gate fails

## Rollback Story

Rollback tier: `tier-1-gate-failure`.

No backup is required for the proposed non-mutating gate refresh.

If a gate fails:

- do not continue to later gates unless the approval explicitly allows collecting more failure evidence
- preserve the redacted failure summary
- do not repair in the same phase unless separately approved
- keep RC implementation blocked

## Approval Decision

Current decision: `BLOCKED_HARD_STOP`.

Allowed future decisions:

- `APPROVED_FOR_DRY_RUN_GATE_REFRESH_ONLY`
- `REJECTED_NEEDS_MORE_EVIDENCE`
- `REJECTED_SCOPE_TOO_BROAD`
- `BLOCKED_HARD_STOP`

## Result

Result: `P22_GATE_REFRESH_APPROVAL_REQUEST_DRAFTED_NOT_APPROVED`

The request is ready for human review.

It is not approval and must not be executed automatically.

## Current Conclusion

| Field | Value |
|---|---|
| project_health | strong |
| governance_health | strong |
| current_truth | P22 planning closed |
| release_state | blocked_for_explicit_RC_approval |
| recommended_action | draft_RC_gate_refresh_approval_request_only |
| do_not_do | tag; release; deploy; provider benchmark; config mutation; migration/import-export apply; public MCP expansion |
