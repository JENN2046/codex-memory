# CM-1182 No-Token Memory Overview Selected-Output Posture Review

Date: 2026-05-26

Status: `CM1182_NO_TOKEN_MEMORY_OVERVIEW_SELECTED_OUTPUT_POSTURE_REVIEW_BLOCKED_NOT_DOWNGRADED_NOT_READY`

## Scope

This is a source posture review only.

Reviewed files:

- `src/adapters/codex-mcp/http.js`
- `src/app.js`
- `src/core/MemoryOverviewService.js`
- relevant existing `memory_overview` tests

This review did not call `memory_overview`, did not call memory tools, did not read raw memory stores or `.jsonl`, did not call a provider/model/API, did not write durable memory/audit state, did not change public MCP tools, and did not change config/watchdog/startup/package files.

## Current Source Facts

- HTTP no-token validation currently allows `memory_overview`.
- The HTTP no-token boundary blocks mutation tools and blocks `search_memory` with `include_content=true`, but it does not block or specialize `memory_overview`.
- `src/app.js` routes `memory_overview` directly to `overviewService.getOverview({ auditWindow, limit })`.
- No request context or no-token/read-only flag is passed into `MemoryOverviewService.getOverview(...)`.
- The authorized path and no-token path therefore receive the same overview projection.

## Positive Observations

- `MemoryOverviewService` does not intentionally return raw memory body fields such as `content` or `rawText`.
- Existing recall-scope test coverage checks that a scoped recall summary does not expose raw workspace detail through `overview.recall.summary.scope`.

These positives are not enough to classify the whole no-token overview response as selected safe output.

## Blocking Findings

Current overview output includes fields that are broader than a no-token selected-output posture:

- `paths` includes operational storage/log/index paths.
- `recentAudit` can include `title`, `memoryId`, `reason`, `filePath`, `agentAlias`, and `agentId`.
- `memoryLinks` can include `memoryId`, `title`, and `filePath`.
- `recall.recent` can include `topMemoryId`, `memoryIds`, `topSourceFile`, `sourceFiles`, tags, database/profile/fingerprint details, and scores.
- `recentFiles` can expose diary file references.
- Provider/profile metadata can expose model/provider/profile posture that is unnecessary for a no-token selected summary.

Because no-token `memory_overview` has no distinct selected projection, the current posture cannot be downgraded to safe for unauthenticated selected-output use.

## Decision

`CM1182_NO_TOKEN_MEMORY_OVERVIEW_SELECTED_OUTPUT_POSTURE_REVIEW_BLOCKED_NOT_DOWNGRADED_NOT_READY`

No narrow blocker downgrade is allowed for no-token `memory_overview` selected-output posture.

This review preserves the CM-1179 narrow downgrade for covered no-token `search_memory` only. It does not extend that downgrade to `memory_overview`, does not claim full no-token governance closure, and does not claim memory recall reliability, memory write reliability, runtime readiness, production readiness, or `RC_READY`.

## Future Acceptance Criteria

A later source/test slice can choose one of two narrow directions:

1. Block no-token `memory_overview` at the HTTP boundary until a selected projection exists.
2. Add a no-token selected projection that returns only counts/status/health classes and excludes operational paths, raw memory content, titles, snippets, reasons, file/source paths, memory ids, workspace ids, agent ids, raw provider details, and raw audit/recall entries.

Minimum future validation:

- no-token HTTP test proves the exact response shape
- authorized bearer-token `memory_overview` behavior is preserved
- public MCP tool list remains unchanged
- no raw memory content is returned
- no durable memory/audit write occurs
- no provider/API call occurs
- no readiness or reliability claim is emitted
