# P21.4 Client Privacy Boundary Fixture Tests

Phase: `P21.4-client-privacy-boundary-fixture-tests`

Status: fixture tests

## Purpose

Add synthetic fixture-only tests for Codex / Claude client privacy boundaries before any runtime behavior change.

This phase adds fixture/test/docs only. It does not edit real Codex or Claude configuration, start HTTP MCP, run `claude mcp`, change runtime behavior, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, or enter release-candidate work.

## Added Fixture And Test

| Artifact | Role |
|---|---|
| `tests/fixtures/p21-client-privacy-boundary-v1.json` | Synthetic client visibility fixture with Codex private, Claude private, shared, project, workspace, and missing-scope records. |
| `tests/p21-client-privacy-boundary-fixture.test.js` | Pure fixture test covering same-client private visibility, cross-client private hiding, project/workspace/shared visibility, low-risk summary redaction, unknown optional scope fallback, and no side effects. |

## Coverage

The fixture locks:

- same-client `visibility=private` remains visible
- cross-client `visibility=private` remains hidden
- `visibility=shared` remains visible to both clients
- `visibility=project` requires matching `project_id`
- `visibility=workspace` requires matching `workspace_id`
- missing optional scope fields normalize to `unknown` / `null`, not inferred
- low-risk summaries hash workspace identifiers instead of exposing raw values
- secret sentinels are not emitted in low-risk summaries
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- `mutated=false`, `providerCalls=0`, and no side effect

## Validation

Targeted fixture validation:

```powershell
node --test tests\p21-client-privacy-boundary-fixture.test.js
```

Required broader validation:

```powershell
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Boundary Confirmation

P21.4 does not:

- change `src/`
- change runtime scope/filter behavior
- edit real Codex configuration
- edit real Claude configuration
- run `claude mcp`
- start HTTP MCP
- install startup/watchdog tasks
- call providers
- read real memory content
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- change MCP schema or public tools
- change package or lockfiles
- tag, release, or deploy

## P21.4 Result

Result: `P21_CLIENT_PRIVACY_BOUNDARY_FIXTURE_BACKED`

P21.4 is sufficient to proceed to client integration standing gate summary.

It is not sufficient to authorize config mutation, runtime behavior changes, MCP public tool expansion, provider calls, migration/import-export apply, or release-candidate work.

## Next Recommended Phase

`P21.5-client-integration-standing-gate-summary`
