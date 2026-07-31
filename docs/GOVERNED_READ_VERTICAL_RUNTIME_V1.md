# Governed Read Vertical Runtime v1

## Status

This is the third ordered `CM-2159` delivery. It connects
`governed_read_attempt.v1` across real loopback HTTP and owner-only UDS
transports for synthetic replay, and it adds the production lease-scoped VCP
worker path. The fourth ordered delivery activates that path in the source
ChatGPT Edge data contract.

The ChatGPT Edge tool count, tool names, and input schemas remain unchanged.
Data response v2 and request/response envelope v2 now reject v1 in source.
Stopped-state rebind, R5-O `_005`, and readiness decisions remain separate
work. The schema-v6 stack stays stopped.

## One transported working set

Every component receives and returns the same bounded working set:

```yaml
header:
  attempt_ref: grat_...
receipts: []
```

The contract package validates the immutable header and complete append-only
receipt prefix at each hop. Request IDs, Relay claim tokens, process IDs, HTTP
connections, UDS sockets, and child handles remain transport metadata; they do
not become protocol identities.

The Edge transient coordinator is still the only terminal CAS owner. A
downstream component may return a complete protocol candidate, but Edge first
validates the whole header, canonical receipt prefix, new receipt suffix,
counter aggregate, and terminal without mutating coordinator state. Only then
does it append the suffix and atomically accept the terminal. A divergent
prefix changes nothing. Timeout or cancellation that wins first rejects every
late candidate.

Attempt admission applies only to the four canonical governed data-read tools.
`resolve_memory_context` remains the preceding context-setup operation and is
queued without an attempt header while attempt mode is enabled.
The four governed reads still fail closed when their header is absent; importing
the contract package's canonical read-tool list avoids a second Edge allowlist.

The Relay response signature also binds the candidate. In attempt mode, the
existing signed `receipt_chain.relay` carries a canonical digest of the request
digest and terminal digest. Edge recomputes that binding after response
signature validation and before terminal CAS. No new signing key or secret is
introduced. The fourth delivery adds only the bounded public `attempt`
projection defined by data response v2.

## Vertical stage ownership

| Stage | Owner | Runtime responsibility |
|---|---|---|
| `CREATED`, `EDGE_VALIDATED` | Edge broker | Admit one immutable attempt and bind it to the validated request/context digests. |
| `RELAY_CLAIMED` | Relay | Preserve the attempt working set over actual Edge HTTP claim transport. |
| `AUTHORIZED` | Governance | Resolve the injected trusted scope and require its query plus the deterministic native limit derived from the signed request (`min(requested-or-5, 5)`) before bridge/provider/native work. |
| `BRIDGE_DELEGATED` | Bridge | Attest `fallback.attempts=0` and forward over the bound loopback Shim HTTP transport. |
| `NATIVE_DISPATCHED`, `SOURCE_PREFLIGHT` | Persistent Shim | Enforce the single-active-attempt lock and run the first source pass before provider execution. |
| `PROVIDER_EMBEDDING` | Provider wrapper | Make at most one parent-owned query embedding call and validate the returned finite exact-dimension vector. |
| `HYDRATION`, `INDEX_RECOVERY`, `VECTOR_SEARCH` | Lease worker | Recheck the source digest, stream one atomic derived transaction, recover exact VCP indexes, and execute one scoped vector search. |
| `SCOPE_POSTCHECK` | Scope checker | Reject any result outside the exact diary allowlist before low-disclosure projection leaves the child. |
| `RESPONSE_FINALIZATION` | Relay | Finalize a signed response only after the downstream continuation validates. |
| terminal | Edge broker | Execute first-terminal-wins CAS. |

Edge treats replay reservation, coordinator acceptance, and the initial
`EDGE_VALIDATED` receipt as one admission transaction. If a post-acceptance
step fails, Edge closes that exact accepted attempt (or observes the terminal
that already won at its deadline), rolls back the replay reservation, and
creates no request record. A still-valid signed request can then be admitted
with a fresh attempt identity without leaking active coordinator capacity.

Governance derives the provider query and native limit only from the validated,
signed tool request, then requires the injected authorization decision to
match that derivation exactly:

| Tool | Canonical provider query | Native limit |
|---|---|---|
| `search_memory` | exact signed `query` | `min(signed limit or 5, 5)` |
| `prepare_memory_context` | exact signed `task_summary`, or `current project task context` when omitted | `5` |
| `memory_overview` | `current project memory overview` | `1` |
| `audit_memory` | `current project memory audit` | `min(signed event_limit or 5, 5)` |

The fixed overview/audit/default-context queries are runtime constants, not
new public arguments. Extra tool arguments, an altered query, or an altered
limit fail before Bridge/provider dispatch. The lease worker reuses the public
contract's `LIMITS.maxQueryCharacters` bound, so a query or task summary
accepted at the signed 2,000-character boundary is not rejected by a narrower
downstream limit.

For a successful lease continuation, Governance independently derives the
canonical public low-disclosure projection from the validated lease result
before invoking the injectable response projector. The returned public
structured content must match that precomputed projection exactly. A zero-hit
lease cannot become a projected result, and a projector cannot substitute a
different statement while retaining native-success receipts. The comparison
adds no raw result or projection digest to receipts, logs, or the public
response.

The attempt projector also derives `memory_overview` and `audit_memory` status
and item count from the validated lease results. Zero hits project as
`empty / 0`; one or more bounded low-disclosure hits project as
`available / item_count`. The public v2 response preserves those tool-specific
fields and adds the canonical terminal projection.

Governance also derives the context digest from the attempt header's validated
context binding and derives the governance digest from the actual signed
request, Relay receipt, accepted authorization or denial evidence, context
digest, tool, and attempt identity. Denial evidence binds the returned status,
structured content, and counters while excluding the receipt digests themselves
to avoid self-reference. Neither a denied invocation nor an injectable
projector can replace either canonical digest with another format-valid value.

An unaccepted Bridge continuation must carry exactly one canonical failure
form: either a final failed receipt or a registry-bound lease-worker terminal
failure candidate. Its result must be `null`, and its projected invocation
must be `unavailable`. An unaccepted continuation ending in a completed
`SCOPE_POSTCHECK`, conflicting failure forms, or a success-shaped projector
result is rejected before Relay finalization.

Bridge accepts only the exact six-field lease response. A response that claims
success is valid only when exact-store cleanup is explicitly complete;
`cleanup_complete=false` or an omitted cleanup fact becomes a Bridge failure
and cannot reach public success or terminal success.

Governance denial, bridge failure, preflight failure, provider failure, child
stage failure, response-finalization failure, timeout, cancellation, and
cleanup failure all use the canonical contract registry. Upper layers forward
the canonical continuation or terminal failure; they do not maintain a second
reason/category/fallback mapping.

The terminal must agree bidirectionally with the signed public response:
success requires `ok`, authorization failure requires `denied`, and every
other canonical failure requires `unavailable`. Relay rejects any contradictory
projection rather than signing it.

Response v2 preserves `null` for a counter field whose downstream evidence is
unknown. The signed envelope's flat counters are derived from the same
terminal and may also contain `null`; Relay and Edge require them to match the
public attempt projection exactly. No projector may replace unknown evidence
with zero.

## Parent-owned preflight and provider

`createGovernedReadLeaseWorker()` is the persistent Shim controller. It:

1. rejects a second attempt before provider execution;
2. appends `NATIVE_DISPATCHED` with one native start and zero primary writes;
3. runs production `preflight()` against the canonical read-only source in a
   separate minimal-environment process, bounded by the smaller of the
   preflight timeout and immutable attempt TTL, so one synchronous SQLite step
   cannot pin the persistent controller;
4. rechecks the attempt deadline and races the injected provider wrapper
   against the smaller of its timeout cap and remaining attempt TTL, passing
   an `AbortSignal`, calling the wrapper at most once, and waiting for
   cancellation cleanup before releasing admission;
5. validates a finite vector whose dimension exactly matches the projection
   plan and remains finite after conversion to the child's `Float32Array`;
6. rechecks the remaining attempt TTL before store creation and again before
   child launch;
7. creates one owner-only attempt directory and fresh derived store;
8. launches and retains the exact child handle with the smaller of the
   configured worker timeout and the remaining absolute attempt TTL, starting
   that timer before the fork so spawn overhead cannot extend the lease;
9. accepts only a response whose receipt chain has the parent prefix and that
   returned before `deadline_at`;
10. deletes the exact attempt directory only after child shutdown is proven.

The production provider wrapper starts one fresh Shim-owned provider child and
calls the exact pinned VCP singleton
`EmbeddingUtils.getEmbeddingsBatch([query], config)` once inside that child.
Provider URL, key, model, query, and dimension cross only the exact IPC handle;
they are not placed in argv or environment. The child inherits only
`LANG`, `LC_ALL`, and `TZ`, and its stdout/stderr are ignored. Console
suppression is child-local, so even a stalled VCP call cannot mute the
persistent Shim's global console.

Timeout or cancellation sends `SIGTERM` only to that exact provider-child
handle. The provider entrypoint installs a first-priority one-shot termination
boundary before loading VCP code, disconnects its IPC channel, and exits itself
on that signal even when the in-flight provider promise does not settle. The
lease does not release its single-attempt admission until the provider child
has exited. A late provider message cannot reverse a termination decision. If
exact shutdown still cannot be proven within the grace bound, the lease returns
`worker_shutdown_incomplete`, latches cleanup closed, and does not pretend that
the provider authority disappeared. The parent keeps that exact child
referenced and its IPC channel bound; it never detaches an unproven child or
uses `SIGKILL`. The derived-store lease child still receives no provider URL,
key, model, or other provider authority.
Only canonical attempt failure evidence leaves the provider stage.

Once controller admission increments `attempts_started`, one shared `finally`
path increments `attempts_completed` exactly once for every resolved or rejected
execution, including dispatch, preflight, provider, pre-store deadline, cleanup,
and child failures. The snapshot therefore cannot retain false unfinished
attempts after a terminal return.

The preflight process receives no provider authority. On timeout the parent
sends `SIGTERM` only to its exact handle and discards a late result. A proven
exit yields a normal `SOURCE_PREFLIGHT` failure; an unproven exit yields the
terminal-level `worker_shutdown_incomplete`, latches the controller cleanup
block, and prevents every later provider admission.

No local fallback exists. A pre-provider rejection carries explicit zero
provider evidence only where the origin can prove downstream dispatch did not
occur. A Bridge transport failure cannot prove that its request was not
accepted before the response was lost, so provider/native counters remain
unknown. Neither registry metadata nor upper-layer error handling turns those
unknown fields into zero.

If an injected non-production provider wrapper ignores abort, no store or
derived child is created; the bounded shutdown wait ends in
`worker_shutdown_incomplete` and latches cleanup closed. The production wrapper
does not retain such an unbounded promise in the persistent Shim because the
exact VCP call lives in the terminable provider child. A provider result that
arrives at or after `deadline_at` is discarded before derived/native work. If
the remaining TTL expires between provider completion and child launch, no
child starts and any newly created empty store is removed. Store creation
failures latch `cleanupBlocked` only when a partially created attempt directory
cannot be removed; a failure that created no resource, or whose partial
resource was removed, does not poison later admission.

Cancellation is rechecked after the provider stage hook and again inside the
scheduled provider task before the wrapper is called. Provider start counters
advance only at that call boundary, so cancellation that wins beforehand
cannot schedule a new external request or fabricate a provider start.

## One absolute transport deadline

Attempt-v1 does not reuse the legacy nested transport timeouts as end-to-end
budgets. The Bridge HTTP client, Governance UDS server, and Relay UDS client
all derive their timer from the immutable `AttemptHeader.deadline_at`.
Successive bounded reconciliation margins are applied after that same absolute
deadline:

```text
Bridge HTTP       deadline_at + 1 second
Governance UDS    deadline_at + 2 seconds
Relay UDS         deadline_at + 3 seconds
```

This ordering lets the downstream provider/worker finish within the attempt
lease and gives a completed continuation time to travel outward. Edge
cancellation still aborts Relay UDS at the attempt deadline and first-terminal
wins; if Edge is unavailable, the bounded nested timers eventually fail
closed. A request first presented at or after `deadline_at` is rejected before
opening a new downstream connection.

Bridge HTTP uses an independent wall-clock timer for its derived budget in
addition to the socket idle guard. Response bytes cannot refresh that absolute
timer, and every success, failure, cancellation, or parse outcome clears it
before the request settles.

Governance UDS tracks frame admission separately from processing completion.
After an attempt frame is admitted, an independent wall-clock timer enforces
the derived deadline; later socket activity cannot refresh or extend it. That
deadline or a peer disconnect aborts the in-progress frame exactly once,
destroys the socket, and propagates one internal `AbortSignal` through
Governance, Bridge HTTP, Shim, the provider wrapper, and the controller-owned
child handle. A late handler result cannot increment accepted-frame counters or
write a response. If exact child shutdown cannot be proven after cancellation,
the existing cleanup latch retains the store and blocks later reads.

The persistent Shim tracks every asynchronous HTTP lease handler separately
from its sockets. `stop()` aborts their signals, closes the listener and exact
sockets, and then waits up to 25 seconds for those handlers to settle. If a
provider or child ignores cancellation beyond that bound, stop fails with
`governed_read_shim_shutdown_incomplete`, keeps the Shim logically started,
and blocks restart. A later stop may complete only after the retained handler
has actually settled.

The fourth delivery installs that attempt HTTP runtime beside the existing
native-MCP listener inside the same controller-owned Shim process. Controller
acceptance requires the recorded PID to own both loopback sockets before
Governance starts. The attempt listener is bound with the existing Governance
runtime identity and does not inherit an Edge token or introduce another
signing secret. Production Governance now instantiates the v2 attempt runtime
and Bridge client directly; the previous application-backed read path is not
kept as a live v1 fallback.

The controller also launches the lease child with an empty `execArgv` list, so
parent `--env-file`, `--require`, and `--import` startup authority cannot cross
the process boundary before the child's minimal-environment checks. A
synchronous fork rejection or asynchronous spawn error without a positive
PID is explicitly reported as child-not-started: the still-empty attempt store
is removed and later admission remains available. Only a PID-bearing child
without provable shutdown can latch cleanup and retain its store.
Once timeout, cancellation, IPC failure, or child error starts termination, a
later success message cannot reverse that decision. A subsequent exact-child
exit proves shutdown and permits store cleanup, but the late result remains a
failed, evidence-incomplete `worker_execution_terminated` terminal candidate
without inventing a child stage. Cancellation remains owned by the Edge
coordinator.

Every non-empty native result must bind to an observed index candidate
`chunkId`. Low-disclosure projection is also completed before
`SCOPE_POSTCHECK` is receipted; malformed projection input therefore becomes a
canonical scope failure with a clean store, never a post-success exception.

Before acknowledgement, the short Edge claim lease still permits safe reclaim
of an abandoned Relay claim. Acknowledgement of an attempt claim atomically
extends that exact claim to `deadline_at`; Edge also evaluates the attempt
deadline independently of request and claim lease expiry. The attempt deadline
must not exceed the signed request expiry. Thus a normal read cannot be
converted into `attempt_timeout` merely because it runs longer than the legacy
five-second claim lease, while no claim can outlive its attempt authority.

Committed coordinator terminals use the same bounded retention window as the
corresponding Edge request record. This keeps terminal lookup and coordinator
capacity aligned across sustained turnover. Request IDs, nonces, and
attempt refs remain in the separate replay guard until their signed expiry;
the guard is sized for the maximum number of terminal-retention windows within
the envelope TTL. A timeout first observed after its deadline anchors both
Edge-record and coordinator-terminal retention at that actual terminal commit
time, rather than immediately pruning the Edge record against the old
deadline. Edge transitions its request record to `expired` only after the
coordinator timeout call returns successfully. A coordinator failure leaves
the request and claim intact and propagates fail closed, so a later refresh can
retry reconciliation without orphaning an active attempt. Expiring a full
terminal record therefore restores admission capacity without making an
accepted identity replayable or leaving hidden coordinator-only retention
pressure.
For a downstream protocol candidate, the coordinator validates the complete
prospective receipt chain and terminal without mutating its record, then
samples the deadline again immediately before its single synchronous commit.
If validation crossed `deadline_at`, the coordinator commits
`attempt_timeout`; none of the candidate receipts or success terminal enter the
record.

Submission identities are held in a rollback-capable replay reservation while
the coordinator admits the attempt. A coordinator rejection releases that
reservation, so a still-valid signed envelope can retry after transient
capacity clears; successful coordinator admission commits the identities
before the Edge request record becomes visible.

The existing 20-second Bridge, 30-second Governance UDS, and 15-second Relay
UDS defaults remain unchanged for non-attempt traffic. No environment
variable, public tool, input schema, signing authority, or live configuration
is added.

## Lease child

The default runner forks
`src/runtime/vcp-native/governed-read-lease-worker-child.js` with only:

```text
LANG
LC_ALL
TZ
```

The task arrives over the exact child IPC handle and supplies the allowed
scope projection, query vector, projection plan/digest, exact VCP code root,
canonical source read reference, and controller-owned derived store. Mapping
metadata and all other authorization fields remain in the parent. The child
sets only the local VCP root/store/full-scan/dimension variables required to
initialize the derived singleton. Provider URL, provider key, OpenAI key, Edge
token, and Relay token are explicitly rejected if inherited.

The child loads the exact VCP `KnowledgeBaseManager` singleton, disables
watchers/background source work, runs production second-pass materialization,
loads the selected diary indexes, executes exactly one vector search, performs
the scope postcheck, creates a low-disclosure result projection, shuts down the
manager, and then exits.

Before recording `VECTOR_SEARCH` success, the child instruments every recovered
allowed-diary index. It records vector and search evidence per diary/index,
requires the sum of recovered vectors to equal the exact hydrated chunk count,
requires every non-empty allowed index to receive an actual search call,
reconciles per-index and aggregate call/success/failure and candidate counts,
rejects one index object reused for different diaries, rejects ghost candidate
removal, and binds each returned chunk identifier to a candidate observed from
that result's diary index. A manager-level result array or evidence from only
one of several non-empty indexes cannot substitute for complete index evidence.

The parent accepts only an exact child response shape whose working set extends
the parent prefix, counters reconcile, success ends at a completed
`SCOPE_POSTCHECK`, and every result item matches the bounded low-disclosure
projection. A normal child failure ends at its canonical failed stage; a
proven post-termination exit instead uses the terminal-level
`worker_execution_terminated` reason without asserting an unknown child stage.
A natural PID-bearing exit also proves process shutdown. If that exit is
nonzero or its result is missing, invalid, or reports incomplete shutdown, the
parent discards the result, removes only that child's exact store, and returns
the same evidence-incomplete `worker_execution_terminated` failure. Invalid
runner evidence without an observed process exit remains incomplete shutdown
evidence; its store is retained and later reads remain blocked.

If graceful completion misses the smaller of the configured worker timeout and
the remaining absolute attempt TTL, the parent may send `SIGTERM` only to the
child handle it created. A child or injected runner result returned at or after
`deadline_at` is discarded even when its shape claims success. The parent never
uses `SIGKILL` and never enumerates or signals an unknown process. If shutdown
or exact-store deletion cannot be proven, the result is
`worker_shutdown_incomplete`, the store is retained, and the controller blocks
every later read before provider execution.

The Bridge accepts `cleanup_complete: false` only when it is paired with the
canonical lease-worker `worker_shutdown_incomplete` terminal candidate.
Ordinary receipt failures, successful results, and other terminal candidates
must attest complete cleanup; a contradictory Shim response is replaced with
the low-disclosure `bridge_delegation_failed` result.

## Real synthetic transport

The end-to-end test uses:

```text
signed request
  → loopback Edge HTTP queue
  → Relay claim/ack HTTP
  → owner-only Governance UDS
  → bound loopback Bridge/Shim HTTP
  → lease worker
  → Relay signed response
  → Edge terminal CAS
  → independent Observer
```

It uses a temporary SQLite primary, production two-pass projection, a
synthetic provider wrapper, and a controller-owned derived store. It retains no
request or response bodies in observations and verifies the primary database
bytes are unchanged. A focused negative path configures every legacy nested
timeout below the synthetic downstream latency and proves that the attempt
still uses its absolute deadline budget; once that deadline is reached, neither
Relay UDS nor Bridge HTTP opens a new downstream connection.

The exact-writer authority job separately checks out and verifies unmodified
VCP commit `555b3b538f6eb736e530c2912de678c5941f9985`. Real
`KnowledgeBaseManager.initialize`, `pendingFiles/_flushBatch`, update, and
delete output now flows through the production lease controller and actual
child process. The job proves:

- provider and native invocation counts are exactly one for the accepted read;
- primary writes and fallback attempts are zero;
- hydration is one committed derived transaction;
- scope postcheck excludes the writer-created unauthorized diary;
- a direct read-only query of the still-live derived SQLite proves that neither
  an unauthorized diary row nor its sentinel chunk was materialized;
- the child has no provider authority;
- the derived store is removed after shutdown;
- no `SIGKILL` occurs;
- mutation between preflight and child materialization fails as
  `source_snapshot_changed_after_preflight` with no derived transaction.

Default local tests still require no VCP checkout, network, provider, private
configuration, or live memory.

## Non-claims

This delivery does not:

- start, restart, rebind, or inspect the stopped schema-v6 stack;
- call a real provider or memory tool;
- read private configuration, raw logs, raw memory, or provider output;
- modify VCPToolBox core or dependencies;
- add, rename, or change any public tool or input schema;
- rebind or activate the held-stopped schema-v6 instance;
- authorize `_005`, deploy, release, publish, or merge;
- establish R5-O acceptance, production readiness, or `RC_READY`.
