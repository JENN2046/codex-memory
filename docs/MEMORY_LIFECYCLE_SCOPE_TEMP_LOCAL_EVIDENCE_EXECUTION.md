# Memory Lifecycle Scope Temp Local Evidence Execution

Status: `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0847`

## Purpose

This execution follows the `CM-0846` plan and moves lifecycle/scope read-policy evidence from pure explicit fixture candidates into an isolated temp-local synthetic workspace.

It remains bounded evidence only. It does not execute true live `record_memory`, true live `search_memory`, read real memory content, read direct real `.jsonl` or durable memory content, call providers, write durable memory/audit state, apply cleanup, apply rollback, expand public MCP, or claim runtime/readiness/reliability.

## Artifacts

- `tests/memory-lifecycle-scope-temp-local-evidence.test.js`
- `docs/MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_EXECUTION.md`

## Temp-Local Method

The targeted test creates one run-specific temp root under the platform temp directory, creates a synthetic store directory inside that root, writes a disposable `synthetic-records.json` file, reads only that synthetic JSON file, runs the lifecycle/scope read-policy helper against the loaded synthetic records, and verifies cleanup.

Path boundary:

- test asserts the synthetic JSON file remains inside the temp root;
- evidence output does not depend on real memory paths;
- cleanup removes the temp root and verifies it no longer exists.

## Synthetic Corpus

The execution uses seven synthetic records:

| memory id | lifecycle | scope behavior | expected effect |
|---|---|---|---|
| `active-exact-current` | active | exact current scope | accepted |
| `proposal-exact` | proposal | exact current scope | suppressed |
| `tombstoned-exact` | tombstoned | exact current scope | suppressed |
| `active-other-project` | active | project mismatch | suppressed |
| `preflight-rejected-exact` | preflight_rejected | exact current scope | suppressed |
| `malformed-scope` | active + malformed scope marker | malformed scope | suppressed |
| `active-folder-beta` | active | folder mismatch | suppressed |

The exact current scope includes user, project, workspace, client, agent, task, conversation, folder, visibility, and retention policy fields.

## Exact Check Count

The execution uses exactly four bounded read-policy checks:

1. `mixed_lifecycle_suppression`
2. `scope_mismatch_suppression`
3. `malformed_scope_fail_closed`
4. `sanitized_output_and_cleanup_verification`

These are not true live `search_memory` queries.

## Evidence Result

Targeted test result:

```text
tests=2
pass=2
fail=0
```

Covered evidence:

- isolated temp root is created and cleaned up;
- synthetic records only;
- exact bounded check count is `4`;
- active exact-scope record is accepted;
- proposal, tombstoned, preflight-rejected, out-of-scope, folder-mismatched, and malformed-scope records are suppressed;
- project and folder mismatches are preserved as sanitized scope mismatch metadata;
- malformed scope fails closed;
- raw synthetic `content`, `text`, `title`, `snippet`, `sourceFile`, and `jsonlLine` fields are absent from evidence output;
- side-effect counters remain zero;
- cleanup is verified.

## Remaining Gaps

This evidence does not prove:

- runtime lifecycle governance implemented;
- runtime read-policy integrated;
- true live recall reliability;
- true live write reliability;
- memory recall reliable;
- memory write reliable;
- durable governance state;
- real corpus pollution prevention;
- cleanup apply;
- rollback apply;
- runtime readiness;
- RC readiness;
- production readiness;
- V8 implementation;
- VCP full parity.

## Next Minimal Gate

The next safe governance gate is `MEMORY_LIFECYCLE_SCOPE_TEMP_LOCAL_EVIDENCE_REVIEW`.

That review should decide whether CM-0847 is sufficient to proceed toward a runtime integration candidate review for lifecycle/scope read-policy, or whether another bounded temp-local case is needed first.

`RC_NOT_READY_BLOCKED` remains the controlling state.
