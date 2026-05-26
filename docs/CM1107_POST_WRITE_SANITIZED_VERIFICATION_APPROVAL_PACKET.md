# CM-1107 Post-Write Sanitized Verification Approval Packet

Date: 2026-05-25
Task: `CM-1107`
Packet id: `CM-1107-POST-WRITE-SANITIZED-VERIFY-APPROVAL-001`
Status: `DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This packet drafts a future exact approval for bounded sanitized post-write verification of the existing CM-1100 proof memory.

This packet does not execute `record_memory`, does not execute `search_memory`, does not execute `memory_overview`, does not read raw memory content, does not read raw store/audit/diary data, does not read `.jsonl`, does not perform a metadata store read, does not call providers, does not write durable memory or audit state, does not apply retention/tombstone/cleanup/rollback/migration work, does not start a worker, does not expand public MCP, does not change config/watchdog/startup/package state, does not push/tag/release/deploy/cutover, and does not claim readiness or reliability.

## Binding

Current draft baseline:

```text
HEAD=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
accepted_memory_id=codex-process-50325be15fdb479d805728fe420b4838
request_sha256=690a01fc17b96124fc7d9dbfb755e87820e4f78cef8b3e1fa26bb2695cf08902
```

Canonical request:

```json
{"packet_id":"CM-1107-POST-WRITE-SANITIZED-VERIFY-APPROVAL-001","task_id":"CM-1107","target_head":"16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d","accepted_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","max_mcp_tool_calls":2,"allowed_calls":[{"tool":"search_memory","arguments":{"query":"codex-process-50325be15fdb479d805728fe420b4838","target":"process","limit":5,"include_content":false,"scope":{"client_id":"codex","strict":true}}},{"tool":"memory_overview","arguments":{"auditWindow":200,"limit":10}}],"forbidden":["record_memory","raw_store_read","raw_audit_read","jsonl_read","metadata_store_read","provider_api","durable_write","retention_apply","cleanup_apply","rollback_apply","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

The packet becomes stale if `HEAD` changes before execution, if the operator edits the canonical request, or if the target proof memory id changes.

## Proposed Future Execution

If separately and exactly approved later, CM-1107 would allow only these calls:

| Step | Tool | Arguments | Purpose |
|---|---|---|---|
| 1 | `search_memory` | `query="codex-process-50325be15fdb479d805728fe420b4838"`, `target="process"`, `limit=5`, `include_content=false`, `scope.client_id="codex"`, `scope.strict=true` | Attempt sanitized public recall verification for the accepted proof memory id. |
| 2 | `memory_overview` | `auditWindow=200`, `limit=10` | Attempt sanitized overview/projection observation around recent memory activity. |

Maximum MCP tool calls: `2`.

No retry is allowed. If either call fails, times out, returns no useful evidence, or returns a shape that cannot be sanitized, execution must stop and record the failure as bounded evidence, not repair by broadening scope.

## Expected Evidence Shape

Allowed output:

- call count
- tool names
- sanitized result counts
- sanitized memory ids if surfaced by the tool
- sanitized metadata flags
- side-effect counters
- failure reasons
- whether the public tool surface is insufficient for exact proof-memory verification

Forbidden output:

- raw memory content
- snippets, raw text, diary content, chat history, or JSONL lines
- file paths into real memory/audit stores
- secret values, tokens, provider keys, auth headers, or database URLs
- broad memory corpus summaries
- readiness or reliability claims

## Acceptance Limits

Because the target memory has `internal_proof` visibility and the public `search_memory` schema has no exact memory-id lookup field, a zero-result or inconclusive result is possible and must not be treated as a runtime failure by itself.

If CM-1107 later executes and passes, it can only downgrade this blocker:

```text
from: no bounded sanitized post-write public-tool verification attempt exists for the accepted proof memory
to: one exact-approved bounded sanitized post-write public-tool verification attempt exists for the accepted proof memory
```

It must not claim:

- `memory write reliable`
- `memory recall reliable`
- public/default write reliability
- public/default recall reliability
- retention/tombstone apply safety
- cleanup/rollback apply safety
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness
- truth-table `complete? = yes`

## Exact Approval Line

The following line is a draft request, not approval:

```text
I approve CM1107_EXACT_APPROVED_POST_WRITE_SANITIZED_VERIFY_ONCE for codex-memory at HEAD 16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d, request_sha256=690a01fc17b96124fc7d9dbfb755e87820e4f78cef8b3e1fa26bb2695cf08902, limited to exactly one `search_memory` call with query `codex-process-50325be15fdb479d805728fe420b4838`, target `process`, limit 5, include_content=false, scope client_id `codex`, strict=true, followed by exactly one `memory_overview` call with auditWindow 200 and limit 10; no retry, no `record_memory`, no raw memory output, no raw store/audit/diary/`.jsonl` read, no metadata store read, no provider/model/API call, no durable memory/audit write, no retention/tombstone/cleanup/rollback/migration apply, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, sanitized output only, no readiness or reliability claim.
```

## Decision

`CM1107_POST_WRITE_SANITIZED_VERIFICATION_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1107 is a draft approval packet only. No verification has run.

## Next Safe Local Task

Wait for separate exact approval before execution, or continue with local no-execution governance/read-policy work.
