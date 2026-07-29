# Governed Read Attempt v1

Status: dormant source contract

Task: `CM-2159 / governed_read_attempt_refactor`

Protocol: `governed_read_attempt.v1`

This document describes the transport-neutral attempt contract introduced by
the first CM-2159 refactor delivery. It does not activate the contract in the
live Edge, Relay, Governance, Bridge, Shim, provider, or VCP path. The active
ChatGPT Edge response remains v1 until the separately reviewed v2 cutover
delivery. No public tool, tool name, or input schema is added here.

## One protocol identity

`resolve_memory_context` remains a context setup operation and does not create a
read attempt. Each later governed data read creates exactly one `attempt_ref`.
Request IDs, response IDs, Relay claim tokens, process IDs, and runtime handles
remain transport or lifecycle metadata; none is a second attempt identity.

`AttemptHeader` is immutable and contains only:

- the protocol and schema version;
- `attempt_ref`;
- read tool name;
- request and context-binding digests;
- creation and deadline timestamps;
- the fixed Edge coordinator role.

It contains no `state`, `current_stage`, request ID, claim token, path, secret,
memory content, provider payload, or mutable counter.

## Ordered evidence

The formal stage order is:

```text
CREATED
→ EDGE_VALIDATED
→ RELAY_CLAIMED
→ AUTHORIZED
→ BRIDGE_DELEGATED
→ NATIVE_DISPATCHED
→ SOURCE_PREFLIGHT
→ PROVIDER_EMBEDDING
→ HYDRATION
→ INDEX_RECOVERY
→ VECTOR_SEARCH
→ SCOPE_POSTCHECK
→ RESPONSE_FINALIZATION
→ TERMINAL_SUCCESS / TERMINAL_FAILURE
```

Each non-terminal transition appends one hash-bound `StageReceipt`. A receipt
binds the unchanged `attempt_ref`, sequence, stage, fixed origin component,
outcome, prior digest, safe counter deltas, and a canonical failure reason when
the stage fails. Sequence gaps, duplicate sequence numbers, stage regression,
origin substitution, unknown reasons, attempt mismatch, digest tampering, and
receipt insertion after failure are rejected.

The header never acquires mutable state. Current progress is derived from the
append-only chain. A terminal envelope is accepted only when all of its fields,
counters, last-completed stage, failure stage, failure origin, category,
fallback policy, and digests can be reproduced from the header and receipts.

## Bounds

```yaml
header_max_bytes: 2048
receipt_max_bytes: 1024
receipt_max_count: 16
terminal_max_bytes: 4096
complete_protocol_max_bytes: 24576
```

The protocol uses the existing canonical JSON and SHA-256 chain helpers. It
does not add a signing secret. Transport signatures, Edge response signatures,
UDS/process identity, and runtime binding remain owned by their existing
layers.

## Canonical failure registry

`packages/chatgpt-r4-contracts/governed-read-attempt.js` is the sole source for
attempt-v1 reason code, category, stage, origin, fallback policy, and
may-have-occurred metadata. Runtime layers must import or generate from this
registry when they are migrated; they must not maintain a second attempt-v1
allowlist.

Every registered attempt-v1 failure has `fallback_policy: forbidden`.
Attempt-v1 therefore never invokes local fallback. Legacy non-attempt calls are
unchanged by this dormant delivery.

`provider_may_have_occurred` and `native_may_have_occurred` only control whether
missing evidence may remain `null`. They never create a zero, one, success, or
failure counter. A pre-provider failure must carry an explicit zero attestation
from the stage that observed the pre-dispatch boundary; otherwise terminal
validation fails closed.

## Counter reconciliation

Receipts contain counter deltas. The terminal projection contains:

```yaml
provider: { started, succeeded, failed }
native_invocation: { started, succeeded, failed }
primary_memory: { write_attempts, writes_committed }
derived_transaction: { started, committed, rolled_back }
fallback: { attempts }
```

Each field is a non-negative integer or `null`. Missing evidence stays `null`.
Every known subset of a provider or native triple must be compatible with one
complete tuple where `started = succeeded + failed` and `started` is at most
one. For example, `{ started: 0, succeeded: null, failed: 1 }` is rejected even
though one field is unknown. Primary write and fallback values, when known,
must be zero.

Derived transaction evidence permits only:

```text
started=1, committed=1, rolled_back=0
started=1, committed=0, rolled_back=1
started=0, committed=0, rolled_back=0
```

Partial derived-transaction evidence must likewise be compatible with at least
one of those complete tuples.

Complete success requires complete evidence, no `null`, no provider/native
failure, zero primary writes, and zero fallback attempts.

## First-terminal-wins

`apps/chatgpt-edge/transient-request-broker.js` owns the in-memory attempt
terminal coordinator. Its terminal commit is a synchronous first-terminal-wins
CAS:

- the first valid downstream candidate, timeout, or cancellation commits;
- every later candidate is rejected as
  `attempt_terminal_already_committed`, even if it is a late completion;
- timeout and cancellation commit failure with
  `evidence_complete: false`;
- `maxAttempts` bounds active non-terminal attempts; a committed terminal
  remains addressable for protocol projection and late-candidate rejection but
  immediately releases its admission slot;
- coordinator loss emits `terminal_missing` for independent observation and
  clears the transient record without fabricating a terminal.

`terminal_missing` is registered so every safe failure/violation code still has
one category/stage/origin definition, but it is explicitly forbidden as a
terminal candidate. It can only be recorded by the Observer as a protocol
violation.

The source coordinator is dormant in this delivery and is exercised only by
synthetic tests. The existing live request broker flow is unchanged.

## Independent low-disclosure observation

The synthetic Edge-to-Observer slice connects the attempt coordinator event
sink to `createGovernedReadAttemptObserver`. The Observer independently
validates header shape, attempt identity, origin, sequence, hash chain, counter
reconciliation, and terminal derivation. It never derives provider or native
facts from an error code.

Its projection contains aggregate counts and a safe protocol-violation code
only. It retains no attempt identifier in the projection, response body, raw
memory, provider response, or secret. `terminal_missing` increments a protocol
violation and does not create success or failure evidence.

## Projections

The owner-only projection contains the complete bounded safe protocol object.
The public low-disclosure projection contains only:

```yaml
protocol:
attempt_ref:
outcome:
last_completed_stage:
failed_stage:
reason_code:
failure_category:
evidence_complete:
counters:
```

Public response schema v2 does not become active in this delivery. The
projection is a contract building block for the later hard-cut PR.

## Non-claims

This source contract does not:

- call a provider or memory tool;
- read private configuration, raw logs, raw memory, or a source database;
- modify VCPToolBox core or dependencies;
- start, restart, rebind, deploy, release, or publish a runtime;
- modify the six ChatGPT Edge tool names or any input schema;
- establish R5-O success, production readiness, or `RC_READY`.
