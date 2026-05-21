# CM-0639 Authorized Write-Path Rendered Operator Packet Workspace-Relative Command Preview Resolution

Status: COMPLETED_VALIDATED
Date: 2026-05-21

## Purpose

Close the remaining governance-only gap left after CM-0638:

- `commandPreviewBundle` already resolved explicit in-workspace assertion-record input into workspace-relative review commands
- `renderedOperatorPacketTextSurface.markdown` still showed placeholder-family command constants in `## Command Preview`

This slice makes the rendered operator packet reuse the already-resolved command preview values, so operators reading packet text do not need to cross-reference JSON to find the copyable review commands.

## What Changed

- `renderedOperatorPacketTextSurface` now uses `commandPreviewBundle.helperCommand`
- it now uses `commandPreviewBundle.governanceReportCommand`
- it now uses `commandPreviewBundle.dashboardCommand`
- it now uses `commandPreviewBundle.httpObserveCommand`
- it now exposes `resolvedAssertionRecordPathMode`
- it now exposes `resolvedAssertionRecordPath`

Result:

- default blocked state still stays fail-closed with `placeholder_only`
- explicit assertion-record input inside the workspace now produces workspace-relative commands both in structured JSON and in the rendered operator packet text

## Boundaries Preserved

This slice:

- does not prove token presence
- does not accept any external assertion by itself
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
- `node .\src\cli\authorized-write-path-auto-authorization.js --json`
- `node .\src\cli\governance-report.js --json`
- `npm test`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

## Outcome

The current governance chain now exposes workspace-relative explicit-assertion review commands consistently across:

- structured command preview
- rendered operator packet text
- helper CLI
- `governance-report`
- `dashboard`
- `http-observe`

The chain still remains blocked on `external_token_assertion_not_accepted`.
