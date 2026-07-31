# Governed Read Attempt v1

Status: active source/runtime contract; R5-O verification blocked

Task: `CM-2159 / governed_read_attempt_refactor`

Protocol: `governed_read_attempt.v1`

This document describes the transport-neutral attempt contract introduced by
the first CM-2159 refactor delivery and activated in source by the fourth
ordered data-response v2 hard cut. After merged-main CI passed, a separately
authorized stopped-state rebind accepted this source contract as the schema-v6
runtime identity. That binding is not R5-O or readiness evidence. No public
tool, tool name, or input schema is added.

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
allowlist. Registry lookup accepts only own properties, so JavaScript prototype
names such as `constructor` remain unregistered and fail closed.

Every registered attempt-v1 failure has `fallback_policy: forbidden`.
Attempt-v1 therefore never invokes local fallback. The four governed reads
fail closed without an attempt; `resolve_memory_context` remains the only
non-attempt data-tool operation.

`provider_may_have_occurred` and `native_may_have_occurred` only control whether
missing evidence may remain `null`. They never create a zero, one, success, or
failure counter. A pre-provider failure must carry an explicit zero attestation
from the failed receipt that observes and closes the pre-dispatch boundary;
completed receipts cannot leave a non-owner zero attestation for later stages.
Otherwise terminal validation fails closed.

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

Before mutating coordinator or Observer state, receipt admission reconciles the
prospective aggregate of all known counter fields. A receipt that would make
the accumulated evidence incompatible with any permitted complete tuple is
rejected without being stored.

A failed receipt must also be able to form its canonical
`evidence_complete: false` failure terminal before it is stored. This applies
the failure registry's unknown-evidence policy at the chain-closing boundary
and prevents an unterminable failed record.

Complete success requires complete evidence, no `null`, no provider/native
failure, zero primary writes, and zero fallback attempts.

## First-terminal-wins

`apps/chatgpt-edge/transient-request-broker.js` owns the in-memory attempt
terminal coordinator. Its terminal commit is a synchronous first-terminal-wins
CAS:

- admission rejects a header created after the coordinator's current clock
  sample, so a future-dated TTL cannot occupy active capacity;
- admission stores the canonical `CREATED` receipt before dispatching Observer
  events, and synchronous event callbacks cannot reenter coordinator mutations;
- the first valid downstream candidate, timeout, or cancellation commits;
- every later candidate is rejected as
  `attempt_terminal_already_committed`, even if it is a late completion;
- candidate admission checks the immutable deadline in the same synchronous CAS
  step; at or after the deadline, the broker commits timeout first and rejects
  the candidate as already terminal;
- receipt admission applies the same deadline ordering before validation or
  storage; a late receipt cannot replace the already-due timeout reason;
- timeout and cancellation commit failure with
  `evidence_complete: false`;
- when no failed receipt already closes the chain, cancellation at or after the
  immutable deadline resolves as timeout; an earlier cancellation remains
  `attempt_cancelled`;
- if a validated failed receipt already exists, timeout or cancellation closes
  the attempt with that receipt's canonical reason, stage, and origin instead
  of replacing its downstream failure evidence;
- `maxAttempts` bounds active non-terminal attempts; a committed terminal
  immediately releases its admission slot;
- `maxRetainedAttempts` separately bounds active plus retained terminal records.
  Request records may use a shorter cleanup window, but that window never
  shortens attempt retention. A terminal remains addressable for protocol
  projection, replay rejection, and late-candidate rejection for one complete
  protocol TTL after terminal commit. Edge sizes the attempt retention pool for
  request-record turnover within that TTL, capped at 4,096 records; expired
  terminals are pruned on admission, and retention saturation fails closed
  instead of growing memory without bound;
- coordinator loss emits `terminal_missing` for independent observation and
  clears the transient record without fabricating a terminal.

`terminal_missing` is registered so every safe failure/violation code still has
one category/stage/origin definition, but it is explicitly forbidden as a
terminal candidate. It can only be recorded by the Observer as a protocol
violation.

The transient Edge broker uses this coordinator for every accepted governed
read in the v2 source path. Source and synthetic tests exercise terminal
competition and capacity reuse. The later authorized rebind accepted this v2
source path as the schema-v6 runtime identity.

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

Observer working state is also bounded. Active plus retained terminal/missing
records cannot exceed its configured retention capacity; terminal and missing
records keep a short late-event window of at least one protocol TTL, are pruned
on later observation, and saturation records a protocol violation rather than
growing memory without bound.

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

Public data response schema v2 carries this projection for each governed read.
The public validator reproduces the registry binding and counter
reconciliation instead of trusting the projection.

## Post-rebind verification boundary

Single-use R5-O `_005` ended before attempt creation. Its one
`resolve_memory_context` result did not provide a usable
`project_context_ref`, so `search_memory` was not invoked. Consequently `_005`
has no attempt header, receipts, terminal envelope, or terminal counters to
reconcile. The resolver's canonical status/reason was not available in the
bounded projection and is not inferred. No retry occurred, and the R5-O
blocker remains open.

## Non-claims

This source/runtime contract and the bounded `_005` outcome do not:

- establish a governed-read search, provider invocation, or attempt terminal
  for `_005`;
- read private configuration, raw logs, raw memory, or a source database;
- modify VCPToolBox core or dependencies;
- authorize another start, restart, rebind, status, resolver, search, provider,
  or memory-tool action;
- deploy, release, or publish a runtime;
- add or rename any of the six ChatGPT Edge tools or modify an input schema;
- establish R5-O success, production readiness, or `RC_READY`.
