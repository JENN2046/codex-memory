# CM1144 Fresh CM1111 Proof Memory Retention Apply Approval Packet

Status: `CM1144_FRESH_CM1111_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`
Packet id: `CM-1144-FRESH-CM1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

CM-1144 refreshes the CM-1111 proof-memory retention tombstone apply approval packet after CM-1143 locally isolated the operator status surfaces in commit `ffa9bbb52d9f69f087128a8daebbddbe1e802ac9`.

This packet is draft-only. It is not approval and it does not execute any command.

## Scope

Target memory:

```text
memory_id=codex-process-50325be15fdb479d805728fe420b4838
source_write_task=CM-1100
source_retention_dry_run=CM-1103
source_gap_review=CM-1110
prior_packet=CM-1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001
```

CM-1103 previously reported a metadata-only no-apply preview for this memory:

```text
record_found=true
lifecycleStatus=active
planned_tombstone_actions=1
planned_action_applies=false
```

CM-1110 reviewed the remaining gap and kept apply/live suppression unproven.

## Binding

Fresh draft baseline:

```text
HEAD=ffa9bbb52d9f69f087128a8daebbddbe1e802ac9
origin/main=e11fe0bd1da3a08eae8c0e2c405ccfd38a55cd28
request_sha256=0c4e30af03dd946c1623639cb1d3bd3bcdaf942a5b6aa4fd52d9a39ba2a1c982
max_runs=1
```

Canonical request:

```json
{"packet_id":"CM-1144-FRESH-CM1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001","task_id":"CM-1111","target_head":"ffa9bbb52d9f69f087128a8daebbddbe1e802ac9","accepted_memory_id":"codex-process-50325be15fdb479d805728fe420b4838","entrypoint":"node src/cli/tombstone-memory.js","max_runs":1,"allowed_command":["node","src/cli/tombstone-memory.js","--json","--memory-id","codex-process-50325be15fdb479d805728fe420b4838","--reason","CM-1111 exact-approved proof-memory retention apply after CM-1103 metadata dry-run and CM-1110 gap review","--evidence","CM-1103 metadata-only dry-run preview found the accepted proof memory active and previewed one no-apply tombstone action; CM-1110 reviewed retention/apply gaps and identified this exact apply as the next separately approvable step.","--tombstone-reason","proof-memory-retention-expired-after-validation","--actor-client-id","codex","--request-source","CM-1111-proof-memory-retention-apply","--apply","--confirm"],"expected_from_status":"active","expected_to_status":"tombstoned","dry_run":false,"confirm":true,"allowed_side_effects":["internal_metadata_policy_read_for_exact_memory_id","one_lifecycle_status_update_if_guards_pass","pending_write_audit_before_mutation","committed_write_audit_after_mutation_or_cancelled_audit_on_guard_failure"],"forbidden":["record_memory","search_memory","memory_overview","raw_memory_output","raw_store_content_read","raw_audit_output","direct_jsonl_read","provider_api","cleanup_apply","rollback_apply","migration_import_export_backup_restore_apply","worker_start","public_mcp_expansion","config_watchdog_startup_package_change","push_tag_release_deploy_cutover","readiness_reliability_claim"]}
```

The prior CM-1111 packet bound to `16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d` is stale for the current local baseline and must not be used.

## Proposed Future Command

If separately and exactly approved later, the only allowed command is:

```powershell
node .\src\cli\tombstone-memory.js --json --memory-id codex-process-50325be15fdb479d805728fe420b4838 --reason "CM-1111 exact-approved proof-memory retention apply after CM-1103 metadata dry-run and CM-1110 gap review" --evidence "CM-1103 metadata-only dry-run preview found the accepted proof memory active and previewed one no-apply tombstone action; CM-1110 reviewed retention/apply gaps and identified this exact apply as the next separately approvable step." --tombstone-reason proof-memory-retention-expired-after-validation --actor-client-id codex --request-source CM-1111-proof-memory-retention-apply --apply --confirm
```

Maximum runs: `1`. No retry is allowed.

## Allowed Side Effects If Future Approved

The future approved command would be a real local mutation if service guards pass. Allowed side effects are limited to:

- internal exact-memory-id record/policy metadata read performed by `TombstoneMemoryService`
- one lifecycle status update for the exact memory id if all guards pass
- one pending mutation audit before lifecycle mutation
- one committed mutation audit after lifecycle mutation, or one cancelled audit if the mutation guard changes before apply
- sanitized CLI stdout

No raw content, evidence, diary, raw audit, direct `.jsonl` lines, vectors, candidate-cache payloads, provider data, or broad store data may be printed.

## Stop Conditions

Stop without execution unless every condition is true at the future execution time:

- user provides a separate exact approval line matching this packet id
- current `HEAD` equals `ffa9bbb52d9f69f087128a8daebbddbe1e802ac9`
- request SHA256 equals `0c4e30af03dd946c1623639cb1d3bd3bcdaf942a5b6aa4fd52d9a39ba2a1c982`
- target memory id equals `codex-process-50325be15fdb479d805728fe420b4838`
- command is exactly the proposed future command
- max runs remains `1`
- no extra preflight broad store scan is requested
- no `record_memory`, `search_memory`, or `memory_overview` is added
- no cleanup, rollback, migration, import, export, backup, restore, worker start, config/watchdog/startup/package change, public MCP expansion, push, tag, release, deploy, or cutover is requested

If the service reports the memory is missing, already tombstoned, not in an allowed source status, lacks lifecycle/tombstone columns, fails audit intent append, or fails a policy guard, that result is a bounded failed/rejected apply attempt, not permission to retry or broaden scope.

## Forbidden Output And Claims

Forbidden:

- raw memory content
- raw evidence
- raw diary content
- raw audit content or direct `.jsonl` lines
- token, secret, provider key, authorization header, or database URL values
- broad memory corpus summaries
- cleanup/rollback safety claim
- public/default lifecycle suppression claim without a separate post-apply verification
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness
- truth-table `complete? = yes`

## Exact Approval Line

The following line is a draft request, not approval:

```text
I approve CM1111_EXACT_APPROVED_PROOF_MEMORY_RETENTION_TOMBSTONE_APPLY_ONCE for codex-memory at HEAD ffa9bbb52d9f69f087128a8daebbddbe1e802ac9, request_sha256=0c4e30af03dd946c1623639cb1d3bd3bcdaf942a5b6aa4fd52d9a39ba2a1c982, limited to exactly one `node .\src\cli\tombstone-memory.js --json --memory-id codex-process-50325be15fdb479d805728fe420b4838 --reason "CM-1111 exact-approved proof-memory retention apply after CM-1103 metadata dry-run and CM-1110 gap review" --evidence "CM-1103 metadata-only dry-run preview found the accepted proof memory active and previewed one no-apply tombstone action; CM-1110 reviewed retention/apply gaps and identified this exact apply as the next separately approvable step." --tombstone-reason proof-memory-retention-expired-after-validation --actor-client-id codex --request-source CM-1111-proof-memory-retention-apply --apply --confirm` run, with sanitized CLI output only, allowing only internal exact-memory-id metadata/policy read, one guarded lifecycle tombstone mutation, and pending/committed or pending/cancelled mutation audit for that exact memory id; no retry, no `record_memory`, no `search_memory`, no `memory_overview`, no raw memory/evidence/diary/audit output, no direct `.jsonl` read, no provider/model/API call, no cleanup/rollback/migration/import/export/backup/restore apply, no worker start, no config/watchdog/startup/package change, no public MCP expansion, no push/tag/release/deploy/cutover, and no readiness or reliability claim.
```

## Decision

`CM1144_FRESH_CM1111_APPROVAL_PACKET_DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY`

CM-1144 is a fresh draft approval packet only. No tombstone apply has run.

## Next Safe Local Task

Wait for separate exact approval before execution. If approval is provided exactly, rerun current Git facts and command-boundary checks before executing CM-1111 once.
