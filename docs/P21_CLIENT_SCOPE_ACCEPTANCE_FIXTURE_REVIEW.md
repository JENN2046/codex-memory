# P21.2 Client Scope Acceptance Fixture Review

Phase: `P21.2-client-scope-acceptance-fixture-review`

Status: review

## Purpose

Map existing scope acceptance tests and docs to P21 client integration gate categories before adding new fixtures.

This phase is review/tests-design plus existing targeted validation. It does not add fixtures, change runtime behavior, edit Codex or Claude configuration, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, or enter release-candidate work.

## Existing Targeted Validation

P21.2 ran existing targeted tests:

| Command | Result |
|---|---|
| `node --test tests\scope-filter.test.js` | `18/18` passed |
| `node --test tests\scope-acceptance-cli.test.js` | `5/5` passed |
| `node --test tests\scope-backfill-dry-run.test.js` | `7/7` passed |

These tests use temporary workspaces / fixture-like local state. P21.2 did not run live Claude CLI checks, live HTTP observation, provider commands, migration, import/export apply, or real memory preview.

## Coverage Map

| P21 gate category | Existing evidence | Status |
|---|---|---|
| client identity preservation | `record_memory` writes `client_id`; `search_memory.scope.client_id` strict negatives; scope acceptance CLI project B uses `client_id=claude` | covered |
| project scope behavior | project A / project B positives and wrong-project strict negatives | covered |
| workspace scope behavior | workspace positive and wrong-workspace strict negatives; raw workspace not emitted in recall/audit text | covered |
| visibility scope behavior | visibility positive/negative cases; schema supports visibility string / array | covered |
| combined scope behavior | project + workspace + client + visibility combined filter returns only full match | covered |
| SQL candidate pushdown | limit underfill regression preserves in-scope result despite higher-scoring off-scope records | covered |
| post-filter fallback | legacy / missing-scope behavior documented and tested | covered |
| recall audit low-risk annotation | audit has scope presence and dimensions without raw `workspace_id` | covered |
| recall output sanitization | diary headers and legacy raw chunk headers are stripped from recall text | covered |
| scope backfill dry-run | `mutated=false`; missing workspace counted; partial scope records reported; `--confirm` does not mutate | covered |
| MCP public schema includes scope fields | `record_memory` / `search_memory` tool definitions cover scope fields and reject additional properties | covered |
| Claude interactive `/mcp` panel | still manual and outside fixture tests | gap |
| cross-client private visibility hard policy | current tests cover client strict filtering, but not a dedicated Codex-private-vs-Claude-private fixture matrix | gap |
| Codex Desktop config guidance drift | no fixture coverage; should remain docs/inventory first | gap |

## Current Strong Evidence

Existing tests already prove:

- scoped `search_memory` filters by `project_id`, `workspace_id`, `client_id`, and `visibility`
- wrong scope values return zero in strict mode
- combined workspace/client filters exclude mismatches
- SQL candidate pushdown avoids losing scoped results under small limits
- recall audit stores low-risk scope dimensions without raw `workspace_id`
- scope metadata survives diary rebuild
- user-authored marker-like content is not mistaken for scope metadata
- raw scope headers are stripped from recall output
- scope acceptance CLI does not retain temp workspace by default
- scope backfill dry-run stays `mutated=false`

## Gaps And Recommended Follow-Up

P21.2 should hand off these gaps:

| Gap | Recommended phase |
|---|---|
| Dedicated cross-client private fixture matrix | P21.4 client privacy boundary fixture tests |
| Claude interactive `/mcp` manual panel check | P21.3 Claude acceptance evidence refresh plan |
| Codex Desktop MCP config guidance inventory | P21.3 or P21.5 docs evidence |
| Public MCP freeze summary in P21 standing gate | P21.5 standing gate summary |
| Lifecycle policy + client visibility interaction evidence | P21.4 fixture tests or later P21 gate |

## Safety Findings

P21.2 confirms these boundaries:

- Do not infer Claude write capability from `client_id=claude` fixture data.
- Do not treat scope tests as approval to edit real Codex or Claude config.
- Do not expose raw `workspace_id` in low-risk summaries.
- Do not expand public MCP tools.
- Do not change `record_memory` public schema without a dedicated approved phase.
- Do not enter P22 release-candidate work from fixture review alone.

## Validation

Targeted validation:

```powershell
node --test tests\scope-filter.test.js
node --test tests\scope-acceptance-cli.test.js
node --test tests\scope-backfill-dry-run.test.js
```

Docs validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## P21.2 Result

Result: `P21_SCOPE_ACCEPTANCE_FIXTURE_REVIEW_READY`

P21.2 is sufficient to proceed to Claude acceptance evidence refresh planning.

It is not sufficient to authorize config mutation, runtime behavior changes, MCP public tool expansion, provider calls, migration/import-export apply, or release-candidate work.

## Next Recommended Phase

`P21.3-Claude-acceptance-evidence-refresh-plan`
