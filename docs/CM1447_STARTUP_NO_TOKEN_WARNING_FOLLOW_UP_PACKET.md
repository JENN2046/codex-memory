# CM-1447 Startup No-Token Warning Follow-Up Packet

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_DOCS_ONLY_NOT_EXECUTED`

## Decision

Do not change startup, watchdog, service install, user config, or runtime launch scripts in this slice.

The safe next route is to treat no-token loopback warning wording as a future exact source/test slice only after the current startup surfaces and test expectations are inspected in that slice.

## Candidate Future Slice

Future task name:

`startup no-token loopback warning wording source/test`

Allowed local scope, if selected later:

- inspect startup warning source and existing startup/log tests
- add or tighten a deterministic unit test around warning text or warning metadata
- keep loopback/no-token behavior unchanged
- keep authenticated and no-token HTTP authorization behavior unchanged

Forbidden without separate exact approval:

- changing Codex or Claude client config
- changing watchdog/startup install/remove/update behavior
- changing listener host/port defaults
- changing token generation or secret material
- running live bearer-token flows
- readiness, release, cutover, or `RC_READY` claims

## Validation

Docs-only validation for this packet is included in `CMV-1557`.

## Boundary

CM-1447 is a docs-only follow-up packet. It did not execute runtime, memory tools, bearer-token paths, provider/API, true memory read/write, raw store scan, durable write, config/watchdog/startup change, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.

