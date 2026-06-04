# CM-1449 audit_memory Readonly Public Contract Prep

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_DOCS_ONLY_CONTRACT_PREP`

## Decision

Do not register `audit_memory` as a public MCP tool in this slice.

The current public MCP tool contract remains frozen:

- `record_memory`
- `search_memory`
- `memory_overview`

## Rationale

Static review correctly identifies controlled mutation and audit explainability as important future work. Repository reality also already contains planning/test surfaces for an `audit_memory` readonly draft, while tests assert it is not publicly listed.

Therefore the safe local move is contract prep only:

- preserve the public-tool freeze
- keep readonly audit design as a future exact public-contract task
- require explicit approval before public MCP registration or schema expansion

## Future Acceptance Sketch

A future `audit_memory` public tool phase should, at minimum:

- be readonly by default
- expose bounded explainability for why a selected memory is visible, hidden, superseded, or tombstoned
- avoid raw content, raw paths, memoryId lookup expansion, raw audit dumps, and broad store scans
- include public tool schema tests
- include HTTP MCP `tools/list` contract tests
- include negative tests for raw, unbounded, mutation, and provider/API behavior
- keep `record_memory`, `search_memory`, and `memory_overview` compatibility intact

## Boundary

CM-1449 did not modify public MCP registration, did not add a new tool, did not change runtime behavior, did not call memory tools, did not read raw audit or raw stores, did not use bearer token, did not call provider/API, did not alter config/watchdog/startup, did not perform remote actions, and did not claim readiness or `RC_READY`.

