# ChatGPT Web R4-G Session-Scoped Live Read Activation And Kill Switch

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Status: `IMPLEMENTED_DEFAULT_CLOSED_EXTERNAL_ACTIVATION_NOT_PERFORMED`

R4-G replaces the R4-F operator procedure that temporarily changed the public
Edge counter mode for each proof. The Edge and Relay may stay compatible with
bounded live-read counters, but only the local Governance process can create a
read authorization. Every process start is closed, every authorization is
in-memory and one-shot, and expiry or an operator kill invalidates it.

This source change does not activate an external service, change Auth0 or
Render configuration, exchange a token, call a provider, or read memory.

## Authority boundary

```text
owner-only local CLI
  -> owner-only control UDS
  -> in-memory session activation controller
       binds one operator principal fingerprint
       binds one startup-selected registered project
       binds one requested visibility
       permits one project_context_ref
       permits one governed read
       expires in 30..300 seconds
  -> existing Governance UDS
  -> existing bounded R4-F selected-diary read
```

An issued context uses the lease's exact millisecond expiry, so whole-second
rounding cannot make the context expire before its authorizing lease.

The activation tool is not an MCP tool. No activation, kill, TTL, project,
mapping, diary, or scope authority is added to the six-tool ChatGPT surface.
The public Edge and outbound Relay still do not own the project registry,
mapping, diary ACL, provider authority, or kill-switch state.

The one-shot transport envelope allows at most 60 seconds for a bounded live
read. A deployment may give the local Governance UDS up to 55 seconds and the
Edge response wait up to 60 seconds, preserving a bounded completion window
without extending the 300-second maximum session activation. Values above
these ceilings fail configuration validation. This transport budget does not
authorize an additional read, retry, provider call, or durable state.

This follows the Apps SDK separation between MCP tool exposure and local
application authorization: tool handlers remain read-only and retry-safe at
the public boundary, while OAuth proves identity and the local Governance
kernel makes the resource authorization decision. See the official
[MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server/),
[authentication guide](https://developers.openai.com/apps-sdk/build/auth/),
and [tool design guidance](https://developers.openai.com/apps-sdk/plan/tools/).

## State machine

```text
process start -> inactive
inactive --activate--> active
active --context issue--> active/context-bound
active/context-bound --read starts--> active/read-in-flight
active/read-in-flight --successful completion--> consumed
active --TTL elapsed--> expired
active --operator kill--> killed
any process stop/restart -> no durable activation -> inactive on next start
```

There is no activation file, database row, hot reload, background renewal, or
automatic reactivation. A terminal lease may be followed only by a new local
operator command with a new request identifier.

## Fail-closed behavior

Before provider/native invocation, Governance verifies all of the following:

- the session lease is active and unexpired;
- the principal fingerprint matches the startup-bound single operator;
- the safe project alias matches the startup-selected registered project;
- requested visibility exactly matches the lease;
- the context reference is the one created by this lease;
- no read is already in flight or consumed;
- the tool is one of the existing four governed read tools.

The session preauthorization check runs before project-registry lookup. While
inactive, or when principal/alias/visibility does not exactly match the lease,
all context-resolution probes return the same bounded `unavailable` shape;
public callers cannot use the closed runtime to enumerate registered projects
or allowed visibilities.

Read tools bind the same session preauthorization to the exact
`project_context_ref` before resolving or validating that ref. Once a lease is
killed, expired, consumed, replaced, or otherwise closed, both a formerly valid
ref and an unknown ref return the same bounded `unavailable` result without
touching provider or native execution.

Failure returns `unavailable` with zero provider/native/write/fallback/global
search counters. If expiry or kill occurs after provider execution starts,
Governance rechecks the lease after the native call. It keeps the actual
provider/native/derived-index/audit counters, replaces the result with an empty
low-disclosure `unavailable` projection, and does not forward the memory result.
Provider/native or receipt-validation failures also finalize and consume the
authorized lease before the error propagates, so a failed invocation cannot
hold `read_in_flight` until TTL or block a replacement operator session.
When an operator kills and replaces a lease while the old native call is still
running, Governance retains a bounded digest-only snapshot of the old in-flight
lease. Its eventual suppression receipt binds to that original activation;
completion cannot consume or relabel the replacement lease. At most eight such
in-flight snapshots can be retained by the controller.

Default-closed requests use a separate bounded 128-attempt process retry
budget. They never consume the legacy 20-call authorized runtime budget, so
platform discovery or context retries before activation cannot disable a later
operator-authorized session. Active-session requests still consume the
authorized budget, and both budgets fail closed independently.

## Startup-only binding

R4-G uses the existing private R4-F binding plus:

```yaml
CODEX_MEMORY_R4_COUNTER_MODE: session_scoped_live_read_v1
CODEX_MEMORY_R4_OPERATOR_SUBJECT_FINGERPRINT_REFERENCE: file:<owner-only-reference>
CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH: <owner-only-private-root-path>
CODEX_MEMORY_R4_REQUEST_TTL_SECONDS: 1..60
CODEX_MEMORY_R4_RELAY_UDS_TIMEOUT_MS: 10..55000
```

The operator fingerprint reference and control socket path are included in the
canonical Governance runtime binding digest. Missing, mismatched, non-owner,
out-of-root, reused, or placeholder authority fails before either UDS starts.
The data and control UDS paths must be distinct and both sockets are mode
`0600` below an owner-only directory.

## Operator commands

The CLI emits only low-disclosure status and receipt digests:

```bash
node ./src/cli/chatgpt-r4-session-activation.js status --json
node ./src/cli/chatgpt-r4-session-activation.js activate --visibility project --ttl-seconds 300 --json
node ./src/cli/chatgpt-r4-session-activation.js kill --reason operator_requested --json
```

Accepted kill reasons are `operator_requested`, `emergency_stop`, and
`verification_complete`. State-changing command request IDs have replay
protection: an exact retry returns the same low-disclosure receipt, while
reusing an ID with a different command is rejected. The process accepts at
most 64 unique state-changing control commands; the final mutation slot is
reserved for `kill`, so an active lease cannot make its emergency stop
unavailable. Status checks do not consume that budget or evict mutation
receipts. Mutation responses project the post-operation session snapshot, so
a kill receipt truthfully reports any native read that remains in flight while
its response is awaiting suppression.

## Counters and receipts

`session_scoped_live_read_v1` keeps the R4-F per-call maxima:

```yaml
provider_calls: 0..1
native_invocations: 0..1
local_fallbacks: 0
primary_memory_writes: 0
derived_index_writes: 0..1
other_durable_mutations: 0..1
unrestricted_native_searches: 0
```

The private receipt chain binds activation authorization, context, Governance,
bridge, native invocation, and native runtime receipts by digest. Public
responses receive only the existing receipt-digest fields; they do not expose
the operator fingerprint, control request, project registry, mapping, diary
names, query log, raw memory, provider response, socket path, or exact private
binding digest.

## Rollback and non-claims

Immediate local rollback is `kill`, stop the R4-G Governance/Relay processes,
and restore the retained R4-E zero-memory runtime binding. Restart alone also
removes activation authority because the lease is not durable.

R4-G source validation does not claim external activation, a live ChatGPT
session, provider execution, real memory recall, production readiness, release
readiness, deploy readiness, cutover readiness, or guaranteed automatic first
task use.
