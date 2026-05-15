# P22 Security Fix Fresh RC Gate Refresh Approval Request

Phase: `P22-security-fix-fresh-rc-gate-refresh-approval-request`

Status: `DRAFT_NOT_APPROVED`

Approval status: `NOT_APPROVED`

Decision: `BLOCKED_HARD_STOP`

Mode: `A5-approval-request-draft`

Risk: `A4`

## Purpose

Request explicit approval for a fresh local non-provider release-candidate gate refresh after the security fix that scans `record_memory` scope metadata for secret-like content.

This document is not approval. It does not authorize gate execution. It does not create a release candidate artifact. It does not create or move a tag.

## Target

`rc_target_commit`: `7fd17de624c0da76751e863e97302bed0dbec905`

Short target: `7fd17de`

Superseded prior candidate target: `806cc847cb37a3e428099b45871a4f1a13c4fa6f`

Superseded prior tag: `p22-rc-806cc847`

Suggested future tag after fresh gates and artifact approval: `p22-rc-7fd17de`

`approval_request_commit`: to be supplied by the closeout after this draft is committed and pushed.

`gate_execution_checkout`: temporary worktree or detached checkout whose `HEAD` must equal `rc_target_commit`.

The main workspace may remain at the approval-request document commit or a later docs-only state. The gate execution checkout is the only checkout that must point at `rc_target_commit`.

## Required Chain

1. Draft approval request for fresh gate refresh at `7fd17de624c0da76751e863e97302bed0dbec905`.
2. Run fresh gates only after explicit approval.
3. Record the fresh gate refresh result.
4. Create a new RC artifact only after explicit artifact approval.
5. Request new tag approval for the new target commit.
6. Create and push a new tag with a new name only after explicit tag approval.

Do not reuse `p22-rc-806cc847` as the final candidate. Do not move the existing pushed tag.

## Proposed Gates

These gates are proposed only. They must not be run until explicit approval is provided.

| Gate | Exact command | Expected result |
|---|---|---|
| main workspace state | `git status --short --branch`; `git rev-parse HEAD`; `git rev-parse origin/main`; `git ls-remote origin refs/heads/main` | main workspace clean; main may be at this approval request commit or later docs-only state |
| execution checkout verification | `git rev-parse HEAD` inside the temporary gate execution checkout | equals `7fd17de624c0da76751e863e97302bed0dbec905` |
| diff hygiene | `git diff --check` | no whitespace errors |
| docs validation | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | `VALIDATION PASSED` |
| security targeted test | `node --test tests\security-write-policy.test.js` | `3/3` pass or better if the test file grows |
| full local test suite | `npm test` | all local tests pass |
| CI-safe fixture gate | `npm run gate:ci -- --json` | `summary.ok=true`, `noProvider=true`, `mutated=false`, compare and rollback pass |
| compare standard suite | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | all standard-suite cases matched |
| rollback standard suite | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | all standard-suite cases rollback-ready |

Strict mainline gate and live HTTP MCP startup are excluded from this request.

## Explicit Exclusions

- no live HTTP MCP startup
- no provider smoke or provider benchmark
- no provider call
- no real memory preview
- no durable memory write
- no Codex or Claude config mutation
- no startup/watchdog operation
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no public MCP expansion
- no package or lockfile change
- no `.env` or secret change
- no RC artifact creation
- no tag creation or tag push
- no GitHub release
- no deploy

## Approval Sentence Template

The user must provide a sentence equivalent to:

```text
I explicitly approve the P22 fresh release-candidate gate refresh for rc_target_commit 7fd17de624c0da76751e863e97302bed0dbec905 using approval_request_commit <APPROVAL_REQUEST_COMMIT>, executed in a temporary gate_execution_checkout whose HEAD equals rc_target_commit, limited to the local non-provider commands listed in docs/P22_SECURITY_FIX_FRESH_RC_GATE_REFRESH_APPROVAL_REQUEST.md, with no live HTTP MCP startup, no release candidate artifact creation, no config mutation, no startup/watchdog operation, no provider call, no real memory preview, no durable memory write, no migration/import-export apply, no public MCP expansion, no package/lockfile change, no .env or secret change, no tag, no release, and no deploy.
```

Do not treat this template as approval.

## Expected Output

Any future approved execution should produce a redacted result summary containing:

```json
{
  "status": "pass|fail|blocked",
  "rc_target_commit": "7fd17de624c0da76751e863e97302bed0dbec905",
  "approval_request_commit": "<APPROVAL_REQUEST_COMMIT>",
  "gateExecutionCheckoutHead": "7fd17de624c0da76751e863e97302bed0dbec905",
  "securityFixIncluded": true,
  "supersedesPriorCandidateTag": "p22-rc-806cc847",
  "mutated": false,
  "providerCalls": 0,
  "releaseCandidateArtifactCreated": false,
  "tagCreated": false,
  "releaseCreated": false,
  "deployPerformed": false,
  "gates": [],
  "blockers": [],
  "nextStep": "record-gate-refresh-result-or-block"
}
```

## Stop Conditions

Stop immediately if:

- approval sentence is missing the exact `rc_target_commit`
- approval sentence does not include the approval request commit from closeout
- temporary gate execution checkout cannot be created or verified safely
- gate execution checkout `HEAD` is not `7fd17de624c0da76751e863e97302bed0dbec905`
- main workspace is dirty before execution
- a command asks for provider credentials
- a command attempts live HTTP MCP startup
- a command attempts config mutation or startup/watchdog operation
- a command attempts durable memory write, migration, import/export apply, MCP expansion, package/lockfile change, `.env` or secret mutation
- a command attempts RC artifact creation, tag, release, or deploy
- any gate fails

## Rollback Story

No data rollback is required for the approval request draft because it is docs/board only.

If a future approved gate refresh fails:

- stop the chain
- record a redacted failure result
- keep `p22-rc-806cc847` marked as superseded by the security fix
- do not create a new RC artifact
- do not request or create `p22-rc-7fd17de`

## Current Decision

Current decision: `BLOCKED_HARD_STOP`

Current release state: `SECURITY_FIX_READY_FOR_FRESH_RC_GATE_REFRESH_APPROVAL`

Recommended next action: wait for explicit approval to run the fresh local non-provider gate refresh for `7fd17de624c0da76751e863e97302bed0dbec905`.
