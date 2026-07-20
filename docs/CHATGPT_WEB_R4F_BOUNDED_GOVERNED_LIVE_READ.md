# ChatGPT Web R4-F Bounded Governed Live Read

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Status: `IMPLEMENTED_DEFAULT_OFF_LIVE_PROOF_PENDING`

R4-F adds the local-only runtime boundary needed to connect the existing
private ChatGPT App route to the existing selected-diary native read. This
document describes source behavior only until the authorized merged-head live
proof is complete.

## Runtime boundary

```text
private ChatGPT App
  -> stateless HTTPS Edge
  <- authenticated outbound Relay
  -> owner-only Governance UDS
  -> private project registry + startup-only diary mapping
  -> existing governed MCP bridge
  -> existing selected-diary VCP native read
```

The Edge and Relay receive only a signed short-lived `project_context_ref` and
signed low-disclosure response. They do not receive the project registry,
mapping, diary names, native target, provider authority, or diary ACL logic.

The Governance runtime is not a package entrypoint and is not imported by any
default runtime. Starting it requires both of these private runtime settings:

```yaml
CODEX_MEMORY_R4_COUNTER_MODE: governed_live_read_v1
CODEX_MEMORY_R4_GOVERNANCE_LIVE_READ_ENABLED: "true"
```

All mapping, registry, signing-key, native-token, state-root, UDS, exact digest,
and target references are loaded startup-only from owner-only non-Git storage.
Missing, mismatched, out-of-root, non-owner-only, non-loopback, or placeholder
authority fails before the UDS starts.

## Project and diary authorization

The private registry is bound to the canonical mapping reference and digest.
The runtime additionally requires one exact selected project alias. A different
project is denied even if it is registered for another local client workflow.

R4-F exposes only these visibility choices:

```text
project
workspace
shared
task_start_context
```

`task_start_context` is implemented as the exact project/workspace shared
union. It does not use the native client-private task-start profile. The R4
registry rejects ChatGPT-private entries, client-bound shared entries,
compatibility/ambiguous entries, and shared mapping entries not owned by a
registered project/workspace.

The native bridge uses a fixed existing governed read principal only after the
R4 project authorization succeeds. Because every eligible shared entry must
have `clientId: null`, this principal cannot alter the selected project or
workspace allowlist. The public tool arguments cannot supply client, scope,
mapping, partition, or diary authority.

## Counter and disclosure contract

The historical zero-memory mode remains the default. R4-F adds a separately
selected bounded counter mode with these per-call ceilings:

```yaml
provider_calls: 1
native_invocations: 1
local_fallbacks: 0
primary_memory_writes: 0
derived_index_writes: 1
other_durable_mutations: 1
unrestricted_native_searches: 0
```

The response contains only bounded result references, low-disclosure summaries,
relevance values, counts, and signed receipt digests. It rejects raw memory,
diary/partition identifiers, mapping identifiers, paths, provider responses,
and raw request/response bodies. A native receipt must prove authorization
before provider use, allowlist enforcement before index load and vector search,
result source post-check, exact mapping binding, no native write, no fallback,
and no unscoped search.

One Governance runtime process accepts at most 20 request attempts, matching the
authorized MCP-call ceiling conservatively even when an attempt is rejected.
It retains only in-memory aggregate counters and receipt-chain digests for the
owner-only proof handoff; request bodies, response bodies, query text, result
summaries, diary names, and raw memory are not retained by this observation
surface. At the call ceiling it fails closed before another provider/native
invocation.

## Rollback

Rollback does not touch memory:

1. stop the R4-F Governance UDS and outbound Relay;
2. restore the retained zero-memory Relay/Edge configuration;
3. set the counter mode back to `zero_memory` and live-read enablement to false;
4. keep the startup-only mapping, registry, and proof artifact private;
5. verify health and the zero-memory contract before any later retry.

## Validation before activation

The source gate covers:

- exact registry/mapping binding and mapping mismatch failure;
- one selected project with registered cross-project denial;
- ChatGPT-private, client-bound shared, unregistered, and ambiguous exclusion;
- all four governed read projections;
- signed Edge/Relay/context flow and one-time context use;
- provider/native/write/fallback/global-search counter ceilings;
- owner-only private references and UDS permissions;
- import fences proving the candidate is still default-off;
- the existing R4, native bridge, MCP, default, hardening, and strict mainline
  regression gates.

The live proof, real counters, non-empty/relevance verdict, derived-index fact,
and actual ChatGPT tool-call observation are not claimed by this source change.
Production, release, deploy, cutover, readiness, and deterministic automatic
first-task use remain false.
