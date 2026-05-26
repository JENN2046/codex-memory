# CM1114 Post Tombstone Public Verify Result Interpretation Matrix

Status: `CM1114_POST_TOMBSTONE_PUBLIC_VERIFY_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Workspace: `A:\codex-memory`

## Purpose

CM-1114 defines how any future CM-1113 public-tool-only post-tombstone sanitized verification result must be interpreted.

This matrix exists to prevent overclaiming from a possible future public `search_memory` / `memory_overview` observation. It does not approve CM-1113, execute CM-1113, call MCP tools, run `tombstone-memory`, read stores, read audit logs, or verify post-apply behavior.

## Source Packet

CM-1114 consumes the draft-only CM-1113 packet as input:

```text
source_packet=CM-1113-POST-TOMBSTONE-SANITIZED-VERIFY-APPROVAL-001
source_packet_status=DRAFT_NOT_APPROVED_NOT_EXECUTED_NOT_READY
target_head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
target_memory_id=codex-process-50325be15fdb479d805728fe420b4838
required_source_result_class=APPLIED_TOMBSTONED_SANITIZED
request_sha256=4693db72ffb82ff959b852f615eefde749a33332f99025624f0634febad4a1bd
```

CM-1113 remains invalid unless CM-1111 first returns `APPLIED_TOMBSTONED_SANITIZED` under CM-1112.

## Matrix

| Class | Future Evidence Shape | Interpretation | Allowed Downgrade | Required Stop |
|---|---|---|---|---|
| `DRAFT_ONLY_NO_EVIDENCE` | CM-1113 remains unapproved or unexecuted | No post-tombstone public-tool evidence exists. | none | Continue local planning only. |
| `FAIL_CLOSED_SOURCE_PRECONDITION_MISSING` | CM-1111 has not returned `APPLIED_TOMBSTONED_SANITIZED` for the exact memory id | CM-1113 is invalid and must not run. | none | Stop before public tool calls. |
| `FAIL_CLOSED_APPROVAL_INVALID` | Approval line missing, stale head, request hash mismatch, memory id mismatch, source-result mismatch, call arguments mismatch, or max calls not exactly `2` | Execution is invalid and must not run. | none | Stop before public tool calls. |
| `INVALID_SCOPE_EXPANSION` | Execution adds `record_memory`, `tombstone-memory`, extra MCP calls, store reads, audit reads, provider/API calls, apply commands, config/startup/package changes, public MCP expansion, or remote actions | Evidence is invalid for CM-1113. | none | Stop and record scope breach. |
| `INVALID_RAW_OR_SECRET_OUTPUT` | Output exposes raw memory content, evidence text, diary content, raw audit payload, `.jsonl` content, token, provider key, auth header, database URL, or broad corpus summary | Evidence is invalid and must be treated as a safety breach. | none | Stop; do not summarize raw value. |
| `FAIL_CLOSED_PUBLIC_TOOL_FAILED` | `search_memory` or `memory_overview` fails to start, times out, returns malformed output, or cannot be interpreted as sanitized output | No reliable public-tool observation. | none | Stop; no retry. |
| `PUBLIC_SEARCH_ZERO_OVERVIEW_INCONCLUSIVE` | `search_memory` returns zero sanitized results for the exact memory-id query, while `memory_overview` gives no exact tombstone/suppression clue | Public search did not return the queried memory id, but durable lifecycle status is not proven. | possible downgrade from no public post-apply observation to one zero-result sanitized public-search observation | Stop before metadata/store verification. |
| `PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY` | `search_memory` returns zero sanitized results and `memory_overview` provides only bounded sanitized hints consistent with tombstone/suppression | Observation is compatible with public suppression, but it is not exact durable lifecycle proof. | possible downgrade to public-tool observation compatible with suppression | Stop before metadata/store verification. |
| `PUBLIC_SEARCH_POSITIVE_SANITIZED` | `search_memory` returns one or more sanitized results for the exact memory-id query without raw content | Post-apply public/default suppression is not proven by CM-1113. The match may be real leakage, unrelated metadata, or an insufficient query surface. | possible downgrade only to sanitized public positive observation requiring review | Stop; no broad search. |
| `PUBLIC_SEARCH_RAW_CONTENT_INVALID` | `search_memory` returns raw content despite `include_content=false` or output includes private raw payload | Evidence is invalid for CM-1113 and indicates a boundary breach. | none | Stop; do not summarize raw content. |
| `OVERVIEW_ONLY_PARTIAL` | `search_memory` is inconclusive or zero, and `memory_overview` provides only aggregate counts or audit-window hints | This is projection/overview context only, not exact lifecycle status. | possible downgrade to one sanitized overview observation | Stop before metadata/store verification. |
| `PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE` | Both calls succeed with sanitized output, but neither proves exact absence, exact lifecycle status, or exact audit correlation | Public-tool evidence is interpretable but insufficient for stronger lifecycle claims. | possible downgrade to bounded sanitized public-tool observation exists | Draft stronger metadata-only exact-id packet if needed. |
| `POST_PUBLIC_VERIFY_METADATA_STATUS_MISSING` | Public-tool observation is favorable but exact lifecycle status remains unobserved | Durable status, audit correlation, and suppression causality are still missing. | none beyond public-tool observation | Draft separate metadata-only exact-id verification packet if needed. |

## Maximum Possible Downgrade

Even in the strongest valid future CM-1113 outcome, the maximum downgrade is:

```text
from: no exact-approved post-tombstone public-tool observation exists
to: one exact-approved sanitized public-tool post-tombstone observation exists for the exact CM-1100 proof memory
```

If the future result is zero-result public search plus bounded overview hints, the maximum more specific wording is:

```text
one exact-approved sanitized public-tool observation did not return the exact memory-id query through the CM-1113 public search surface
```

It still does not prove:

- exact durable lifecycle status
- raw store absence
- raw audit correlation
- causal tombstone suppression
- cleanup safety
- rollback safety
- long-run durability
- automatic retention worker safety
- startup/watchdog enforcement
- public/default write reliability
- public/default recall reliability
- `memory write reliable`
- `memory recall reliable`
- runtime readiness
- RC readiness
- production readiness
- release/cutover readiness
- truth-table `complete? = yes`

## Follow-Up If CM-1113 Later Produces Favorable Public Observation

If a future CM-1113 execution returns `PUBLIC_SEARCH_ZERO_OVERVIEW_HINT_ONLY` or `PUBLIC_TOOLS_BOTH_OBSERVED_INCONCLUSIVE`, the next safe step is not a reliability claim. The next safe step is a separate exact approval packet for metadata-only exact-id lifecycle verification, if stronger evidence is needed.

That future packet must decide whether it needs:

- exact memory-id lifecycle status observation
- bounded audit intent/commit correlation observation
- selected metadata columns only
- no raw memory/audit/diary/`.jsonl` output
- no cleanup/rollback apply
- no readiness/reliability claim

## Boundary

CM-1114 performed:

- local interpretation matrix drafting
- docs/status/board update

CM-1114 did not perform:

- CM-1111 approval
- CM-1111 execution
- CM-1113 approval
- CM-1113 execution
- `tombstone-memory` run
- `record_memory`
- `search_memory`
- `memory_overview`
- raw memory, raw store, raw audit, diary, or `.jsonl` read
- metadata store read
- durable memory/audit write
- tombstone apply
- cleanup apply
- rollback apply
- migration/import/export/backup/restore apply
- provider/API/model call
- worker start
- public MCP expansion
- config/watchdog/startup/package/lockfile change
- push/tag/release/deploy/cutover
- readiness or reliability claim

## Decision

`CM1114_POST_TOMBSTONE_PUBLIC_VERIFY_RESULT_INTERPRETATION_MATRIX_COMPLETED_NOT_EXECUTED_NOT_READY`

CM-1114 is a no-execution matrix only.
