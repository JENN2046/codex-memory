# Memory Access Contract

This is the current client and visibility contract for `codex-memory`.

## Governed native callers

```yaml
clients:
  - Codex
  - Claude
```

Caller identity comes from trusted execution or transport context. Tool
arguments and governance metadata cannot replace the transport identity.
`manual` is a local/public record owner or filter value, not a governed native
caller identity.

## Public record owner/filter values

```yaml
client_id:
  - codex
  - claude
  - manual
```

`omc` is legacy compatibility data only. It is not accepted by the current
public MCP schema and cannot authorize native access.

## Visibility

```yaml
visibility:
  - private
  - workspace
  - project
  - shared
```

`shared` means explicit cross-client sharing inside the trusted governed scope.
It must come from trusted execution or transport context; a tool payload cannot
widen `private`, `workspace`, or `project` access to `shared`. `public` is not a
current visibility value.

These values are defined once in `src/core/MemoryAccessContract.js` and reused
by public schemas, native gates, projections, delegation adapters, audit
receipts, metadata, and tests.

## Evidence limits

Repository tests cover Codex and Claude identity/scope binding. Historical live
dogfood evidence is Codex-only. This contract does not claim fresh native live
proof, Claude live runtime completion, production readiness, release readiness,
or cutover readiness.
