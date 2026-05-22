# Memory Recall Limited Local Real-Path Readiness Plan

Status: `MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_READINESS_PLAN_COMPLETED_NOT_READY`
Date: 2026-05-22
Scope: plan-only bridge from synthetic temp-workspace recall evidence to a limited local real-path bounded evidence packet
Baseline: `a408ae4fcaa60792ca663d58da2f056185dccad8`
Controlling state: `RC_NOT_READY_BLOCKED`

## Purpose

This plan defines the next bounded recall-evidence layer after CM-0755 fixture evidence and CM-0758 temp workspace evidence.

The next layer should exercise repository local recall-path code with a fully isolated temp root and synthetic records only. It must remain between synthetic harness evidence and true live real-store `search_memory`.

This plan does not execute true live `search_memory`, does not read real memory content, does not read `.jsonl` audit or durable memory content, does not call providers, does not write durable memory or audit state, and does not claim memory recall reliability.

## Entry Evidence

Accepted prior layers:

- CM-0755 bounded fixture evidence: expected synthetic result, irrelevant suppression, no-token/readOnly zero side effects, and timeout/error boundary.
- CM-0756 bounded fixture review: sufficient for the next temp workspace plan only.
- CM-0757 temp workspace evidence plan: isolated temp root, four synthetic seeds, exactly four queries, sanitized output, and cleanup.
- CM-0758 temp workspace evidence execution: targeted test passed with isolated temp root, four synthetic `.json` seeds, exactly four bounded queries, sanitized output, and cleanup verification.
- CM-0759 temp workspace evidence review: sufficient to support this limited local real-path planning layer only.

## Local Real-Path Boundary

For this plan, "limited local real-path" means:

- Use checked-in local recall-path modules and helpers where possible.
- Use a run-specific temp root under the repository `tmp/` tree.
- Use synthetic memory records only.
- Keep all generated stores, indexes, cache-like artifacts, and evidence output inside the run-specific temp root.
- Use local deterministic embedding/ranking substitutes only when the code path requires embedding-like or score-like behavior.
- Emit sanitized evidence without raw memory content.
- Verify cleanup of the run-specific temp root.

For this plan, "limited local real-path" does not mean:

- true live MCP `search_memory` against the real store;
- broad real memory scan;
- real memory content read;
- `.jsonl` audit or durable memory content read;
- provider/model/API call;
- durable memory write;
- durable audit write;
- migration/import/export/backup/restore apply;
- public MCP expansion;
- config/watchdog/startup change;
- runtime, RC, production, release, cutover, memory recall reliability, or VCP parity readiness.

## Temp Root Policy

Future execution must create exactly one run-specific root:

```text
<repo>/tmp/memory-recall-limited-local-real-path-evidence/CM-0761-<run-id>
```

Rules:

- Resolve the parent root before writing.
- Resolve the run root before writing.
- Reject any target outside `<repo>/tmp/memory-recall-limited-local-real-path-evidence`.
- Write synthetic seed and local temporary evidence artifacts only under the run root.
- Never follow or create symlinks for the evidence root.
- Cleanup may remove only the resolved run root.
- Cleanup verification must prove the run root no longer exists.

## Synthetic Seed Shape

Future execution should use exactly four synthetic records:

| id | folder | role | timestamp intent |
|---|---|---|---|
| `local-realpath-expected-current` | `alpha` | expected current result | newest |
| `local-realpath-expected-older` | `alpha` | expected older result | older |
| `local-realpath-irrelevant-same-folder` | `alpha` | same-folder irrelevant suppression | current-ish |
| `local-realpath-irrelevant-other-folder` | `beta` | folder-scope suppression | current-ish |

Seed rules:

- Synthetic content only.
- No real user memory text.
- No copied real diary/audit/store content.
- No `.jsonl` seed format.
- Include only sanitized IDs in evidence output by default.
- Include folder and timestamp metadata needed for folder/freshness assertions.

## Query Count

Future execution should run exactly four bounded local recall-path checks:

1. Expected-result query: returns `local-realpath-expected-current` before `local-realpath-expected-older`.
2. Irrelevant-suppression query: excludes same-folder and other-folder irrelevant records from accepted output.
3. Alpha folder-scope query: returns only alpha-folder accepted results and excludes beta-folder records.
4. Timeout/error-boundary query: returns bounded `SEARCH_MEMORY_TIMEOUT` with the expected JSON-RPC error code shape and zero side-effect counters.

Any additional query must fail the packet as scope drift unless a later exact approval changes the query count.

## Evidence Output Shape

Future execution should record sanitized evidence with this shape:

```text
result
baseline
tempRootSanitized
seedCount
queryCount
expectedResultIds
suppressedResultIds
folderScope
freshnessOrder
timeoutError
sideEffectCounters
cleanupVerified
forbiddenActions
noOverclaim
```

Output constraints:

- Use IDs, counts, booleans, and sanitized path placeholders.
- Do not print raw synthetic content except where the test fixture itself owns the string and the evidence output is explicitly proving absence from serialized output.
- Do not print real memory content.
- Do not print `.jsonl` paths or contents.
- Do not print provider keys, credentials, environment values, or auth material.

## Pass Criteria

Future execution may report `MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_BOUNDED_EVIDENCE_COMPLETED_NOT_READY` only if all are true:

- Run root is isolated under the allowed temp parent.
- Exactly four synthetic records are seeded.
- Exactly four bounded local recall-path checks are executed.
- Expected current result is returned before the older expected result.
- Irrelevant records are suppressed from accepted output.
- Alpha folder scope excludes beta records.
- Timeout/error boundary returns the bounded timeout shape.
- Side-effect counters show no provider calls, real memory reads, `.jsonl` reads, durable memory writes, or durable audit writes.
- Evidence output is sanitized.
- Cleanup is verified.
- `memory recall reliable` remains not claimed.
- `RC_NOT_READY_BLOCKED` remains.

## Fail Criteria

Future execution must report a failed or blocked not-ready result if any are true:

- The run root resolves outside the allowed temp parent.
- Seed count is not exactly four.
- Query count is not exactly four.
- A real memory path is opened or scanned.
- `.jsonl` audit or durable memory content is read.
- A provider/model/API call is attempted.
- A durable memory or durable audit write is attempted.
- Cleanup cannot be verified.
- Output includes raw real memory content or secrets.
- Any readiness claim appears.

## Forbidden Actions

This plan does not authorize:

- true live `search_memory` against the real store;
- true live `record_memory`;
- real memory content read;
- `.jsonl` audit or durable memory content read;
- provider/model/API call;
- real memory broad scan;
- durable memory write;
- durable audit write;
- migration/import/export/backup/restore apply;
- public MCP expansion;
- config/watchdog/startup change;
- package or lockfile change;
- force push or branch rewrite;
- tag/release/deploy/cutover;
- runtime ready, RC ready, production ready, memory write reliable, memory recall reliable, V8 implemented, or VCP full parity claim.

## No-Readiness Wording

Allowed wording:

```text
bounded local real-path evidence only
limited temp-root synthetic evidence
not memory recall reliable
RC_NOT_READY_BLOCKED remains
```

Forbidden wording:

```text
memory recall reliable
runtime ready
RC ready
production ready
release ready
cutover ready
VCP full parity
V8 implemented
```

## Next Step

The next executable evidence packet may be:

```text
MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_BOUNDED_EVIDENCE_EXECUTION
```

It must be separately scoped to fixture/temp-root/local-only execution and must keep the hard-stop boundaries above.

Result: `MEMORY_RECALL_LIMITED_LOCAL_REAL_PATH_READINESS_PLAN_COMPLETED_NOT_READY`.
