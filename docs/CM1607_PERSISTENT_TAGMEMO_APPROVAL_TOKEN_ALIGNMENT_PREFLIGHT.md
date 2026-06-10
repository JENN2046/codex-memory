# CM1607 Persistent TagMemo Approval Token Alignment Preflight

## Scope

This document aligns approval token semantics across:

```text
docs/V8_TAGMEMO_PERSISTENT_ENRICHMENT_APPROVAL_ENVELOPE.md
docs/V8_TAGMEMO_PERSISTENT_ENRICHMENT_PROOF_COMMAND_ENVELOPE.md
src/tagmemo/persistent-enrichment-proof-command.js
docs/CM1606_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_DECISION.md
```

This step is docs/source preflight only. It does not change the command skeleton and does not execute persistent tag writes.

```text
current execution approval token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT
current skeleton guard token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF
current result: apply fail-closed due token mismatch
persistent tag write: STILL_BLOCKED
persistent tag enrichment: NOT_STARTED
actual proof execution: NOT_STARTED
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Current Token Map

| Token | Current Source | Current Meaning | Current Acceptance |
|---|---|---|---|
| `APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF` | Approval envelope, command envelope, skeleton constant, fixture | Skeleton internal guard token and original future proof approval wording | Accepted by skeleton, but `apply` still returns `blocked / apply_stub_no_persistent_tag_write_executed` |
| `APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT` | CM-1606 user instruction and execution decision receipt | Operator post-audit execution approval token | Not accepted by skeleton; `apply` returns `rejected / missing_exact_approval` |

## Alignment Decision

Future source work should use a dual-token model:

```text
operator execution token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT
skeleton internal guard token: APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF
```

The operator execution token confirms that a human authorized attempting a bounded post-audit proof.

The skeleton internal guard token confirms that the command runner is intentionally entering the guarded apply branch.

Both tokens must be present before any future apply path can progress beyond fail-closed validation.

## Future Apply Guard Design

A future source/test slice may add an explicit approval object:

```js
{
  operatorExecutionToken: 'APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT',
  skeletonGuardToken: 'APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF'
}
```

`apply` must reject unless all checks pass:

```text
operatorExecutionToken exact match: true
skeletonGuardToken exact match: true
dryRunPlanHash matches current dry-run output: true
maxWriteCount: 1
writeCountRequested: 1
sidecarTarget: temp-local-tagmemo-proof-sidecar
inputSource: bounded fixture or later exact bounded selected projection
rollbackPlanHash present: true
cleanupPlanHash present: true
tombstoneSyncState safe: true
publicMcpSurfaceCount: 7
providerApiCalls: 0
bearerTokenUse: 0
rawScanRun: false
broadMemoryScanRun: false
```

If any check fails, the command must return low-disclosure fail-closed output with:

```text
writeCountExecuted: 0
persistentTagRecordsWritten: 0
confirmedMutation: 0
```

## Execution Envelope Update Plan

Future command envelope docs should distinguish:

- `--operator-approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF_EXECUTION_AFTER_AUDIT`
- `--approval APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF`

The `--approval` flag may remain the skeleton internal guard token for backward compatibility with CM-1604 tests.

The post-audit operator token should be added as a separate flag. Do not overload one token to mean both human authorization and command-branch guard.

## Test Plan

Future source/test implementation should add cases for:

- missing operator token rejects
- missing skeleton guard token rejects
- operator token only rejects
- skeleton guard token only rejects
- both tokens but mismatched dry-run hash rejects
- both tokens but `maxWriteCount` not equal to `1` rejects
- both tokens but target sidecar is not `temp-local-tagmemo-proof-sidecar` rejects
- both tokens and valid bounded fixture still returns no persistent write until a separate write-capable source slice is explicitly authorized
- forbidden raw/private/provider/token/API-shaped fields stay out of output
- public MCP surface remains seven tools

## Forbidden Boundary Review

```text
execute persistent tag write: NO
second effective record_memory write: NO
provider/API: NOT_USED
bearer token: NOT_USED
raw scan / broad memory scan: NOT_RUN
live proof: NOT_EXECUTED
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Validation

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

## Next Safe Route

```text
CM-1608 persistent TagMemo dual-token proof guard fixture/test coverage
```

The next route should add fixture/test coverage for the dual-token guard. It must not execute persistent tag writes.
