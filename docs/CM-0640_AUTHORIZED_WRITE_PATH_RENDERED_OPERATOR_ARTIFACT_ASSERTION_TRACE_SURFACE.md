# CM-0640 Authorized Write-Path Rendered Operator Artifact Assertion Trace Surface

Status: COMPLETED_VALIDATED
Date: 2026-05-21

## Purpose

Close the next governance-only consistency gap after CM-0639.

Before this slice:

- `assertionRecordInputTrace` already existed as structured data
- `artifactBundleDraft` and `operatorPacketDraft` already carried that trace
- `renderedOperatorPacketTextSurface` already exposed resolved workspace-relative review commands
- but `renderedArtifactTextSurface.selectedDraftMarkdown` did not carry the same explicit assertion provenance

That meant future operators could read the current draft text but still needed to cross-check top-level trace or packet text to see which assertion artifact path actually drove the current result.

## What Changed

- `renderCm0611AssertionRecordDraft()` now includes `## Assertion Input Trace`
- `renderCm0614IssuanceDraft()` now includes `## Assertion Input Trace`
- `renderCm0615RoutingOutcomeDraft()` now includes `## Assertion Input Trace`
- `renderCm0616WideningReviewDraft()` now includes `## Assertion Input Trace`
- `buildRenderedArtifactTextSurface()` now consumes `assertionRecordInputTrace`

The rendered draft text now shows:

- trace summary
- source format
- source file
- source workspace-relative path
- source artifact ref
- whether the assertion was accepted for `CM-0608/C6`

## Boundaries Preserved

This slice:

- does not prove token presence
- does not issue approval
- does not execute `CM-0601`
- does not auto-authorize `CM-0595`
- does not call `record_memory`
- does not call `search_memory`
- does not start services
- does not read `.jsonl`
- does not call providers

Current controlling state remains `RC_NOT_READY_BLOCKED`.

## Validation

- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`

## Outcome

The same explicit assertion provenance is now visible across:

- top-level `assertionRecordInputTrace`
- `artifactBundleDraft`
- `operatorPacketDraft`
- rendered current draft text
- rendered current packet text

Future operators can now review the current draft itself without separately reopening JSON provenance fields just to see which assertion artifact path drove the current blocked/reuse/escalate result.
