## CM-0642 Authorized Write-Path Rendered Operator Brief Text Surface

Status: COMPLETED_VALIDATED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-21

### Purpose

`CM-0642` narrows the current governance-only operator surface around the authorized write-path chain by adding one self-contained `renderedOperatorBriefTextSurface`.

The intent is simple:

- future operators should not need to export the rendered operator packet and the selected rendered artifact draft separately
- the current blocked/reuse/escalate state should remain readable as one ready-to-review text artifact
- the chain should stay explicit-input, read-only, fail-closed, and governance-only

### Scope

This slice only refines the operator-facing governance surface.

It does not:

- prove token presence
- issue approval
- execute `CM-0601`
- authorize `CM-0595`
- call `record_memory`
- call `search_memory`
- bind token material
- start HTTP runtime
- run health probes
- read `.jsonl`
- call provider services
- mutate config or startup persistence
- expand the public MCP surface
- write durable state
- claim runtime/RC/production readiness

### Changed Files

- [src/core/AuthorizedWritePathAutoAuthorizationPreflight.js](/A:/codex-memory/src/core/AuthorizedWritePathAutoAuthorizationPreflight.js)
- [src/cli/authorized-write-path-auto-authorization.js](/A:/codex-memory/src/cli/authorized-write-path-auto-authorization.js)
- [src/cli/governance-report.js](/A:/codex-memory/src/cli/governance-report.js)
- [src/cli/dashboard.js](/A:/codex-memory/src/cli/dashboard.js)
- [src/cli/http-observe.js](/A:/codex-memory/src/cli/http-observe.js)
- [tests/authorized-write-path-auto-authorization-preflight.test.js](/A:/codex-memory/tests/authorized-write-path-auto-authorization-preflight.test.js)
- [tests/authorized-write-path-auto-authorization-cli.test.js](/A:/codex-memory/tests/authorized-write-path-auto-authorization-cli.test.js)
- [tests/governance-report-cli.test.js](/A:/codex-memory/tests/governance-report-cli.test.js)
- [tests/dashboard-cli.test.js](/A:/codex-memory/tests/dashboard-cli.test.js)
- [tests/http-observe-cli.test.js](/A:/codex-memory/tests/http-observe-cli.test.js)

### Outcome

The evaluator and normal read-only control surfaces now expose one stage-aware `renderedOperatorBriefTextSurface`.

That brief:

- preserves the current governing decision
- embeds the current rendered operator packet
- embeds the currently selected rendered artifact draft
- keeps the same stage/bundle/packet context in one reviewable text export

Default real output remains fail-closed:

```text
allowedGovernanceOutput = NO_AUTO_APPROVAL_ISSUED
decision = RC_NOT_READY_BLOCKED
reason = external_token_assertion_not_accepted
briefKind = assertion_record_only__assertion_record_operator_packet
```

### Validation

Validated in this slice:

- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --check .\src\cli\governance-report.js`
- `node --check .\src\cli\dashboard.js`
- `node --check .\src\cli\http-observe.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `node --test .\tests\governance-report-cli.test.js`
- `node --test .\tests\dashboard-cli.test.js`
- `node --test .\tests\http-observe-cli.test.js`
- `node .\src\cli\authorized-write-path-auto-authorization.js --rendered-operator-brief-text`
- `node .\src\cli\governance-report.js --rendered-operator-brief-text`

### Boundary

`CM-0642` is a governance-only rendered brief refinement.

It makes the current packet-plus-draft pair easier to review, but it does not move the chain past the existing blocker. The controlling state remains `RC_NOT_READY_BLOCKED`, and any future move toward `CM-0595` still requires a real external token-material change plus the already-defined fail-closed governance chain.
