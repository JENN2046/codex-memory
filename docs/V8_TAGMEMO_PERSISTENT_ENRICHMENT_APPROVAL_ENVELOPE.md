# V8 TagMemo Persistent Enrichment Approval Envelope

## Scope

This document prepares the exact approval envelope for a future persistent TagMemo enrichment proof.

This step is docs-only. It does not execute persistent tag writes, runtime proof, live proof, provider calls, raw scans, or public MCP expansion.

```text
persistent tag write: STILL_BLOCKED
persistent tag enrichment: NOT_STARTED
sidecar dry-run adapter: IMPLEMENTED_AND_AUDITED
actual persistence requires exact approval: YES
public MCP surface: STILL_7_TOOLS
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Future Exact Approval String

The only approval string that may activate a future bounded persistent enrichment proof is:

```text
APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF
```

Any other wording is a rejection or no-op for persistent tag writes.

## Allowed Future Command Envelope

A future proof command must be explicitly named in a later task before execution. The command must be bounded and must prove dry-run-to-persistent behavior without broad scans or public MCP expansion.

The future command envelope must include:

- exact command line
- target workspace
- target bounded fixture or bounded projection source
- maximum tag records to write
- dry-run preview command
- apply command guarded by `APPROVE_PERSISTENT_TAGMEMO_ENRICHMENT_PROOF`
- rollback command or cleanup command
- tombstone sync proof command
- validation commands

No persistent command is authorized by this document.

## Write Boundary

Future persistent enrichment proof must be bounded to:

- sidecar tag records only
- bounded tag projections only
- deterministic source version only
- no raw memory records
- no provider/API payloads
- no bearer tokens
- no raw audit or broad store scan output
- no public MCP response expansion

The proof must reject any projection containing raw/private/provider/token-shaped fields.

## Proof Evidence Format

Future proof evidence must record:

```text
approval_string_seen
approval_string_exact_match
bounded_input_source
dry_run_plan_hash
write_count_requested
write_count_executed
persistent_tag_records_written
second_effective_record_memory_write
rollback_plan_hash
cleanup_plan_hash
tombstone_sync_state
public_mcp_surface_count
provider_api_calls
bearer_token_use
raw_scan_run
broad_memory_scan_run
production_ready_claim
release_ready_claim
cutover_ready_claim
complete_v8_claim
```

## Rollback / Cleanup / Tombstone Sync Boundary

Future proof must define rollback before any write is executed.

Rollback and cleanup evidence must be low-disclosure and bounded to derived sidecar ids, rollback tokens, cleanup plan references, and tombstone sync states.

Tombstone sync must fail closed when:

- source memory is tombstoned
- source memory state is unavailable
- rollback token is missing
- cleanup plan reference is missing
- projection hash is invalid
- forbidden raw/private fields are detected

## Abort Criteria

Abort before any persistent tag write if:

- exact approval string is missing or does not match
- worktree is dirty with unrelated changes
- `HEAD` and expected target are ambiguous
- input is raw, unbounded, or private-field shaped
- provider/API, bearer token, raw scan, or broad scan is requested
- public MCP surface would change
- rollback or cleanup plan is missing
- tombstone sync state is unsafe
- validation fails
- readiness or complete V8 claim would be implied

## Forbidden In This Step

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
