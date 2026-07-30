# Governed Read Vertical Runtime v1

## Status

This is the dormant third ordered `CM-2159` delivery. It connects
`governed_read_attempt.v1` across real loopback HTTP and owner-only UDS
transports for synthetic replay, and it adds the production lease-scoped VCP
worker path. It does not activate the path in the public Edge data tools.

The ChatGPT Edge tool count, tool names, input schemas, and active v1 response
remain unchanged. Public response v2, live v1 rejection, stopped-state rebind,
R5-O `_005`, and readiness decisions remain separate work. The schema-v6 stack
stays stopped.

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

The Relay response signature also binds the candidate. In attempt mode, the
existing signed `receipt_chain.relay` carries a canonical digest of the request
digest and terminal digest. Edge recomputes that binding after response
signature validation and before terminal CAS. No new signing key, secret, or
public response field is introduced.

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

Governance denial, bridge failure, preflight failure, provider failure, child
stage failure, response-finalization failure, timeout, cancellation, and
cleanup failure all use the canonical contract registry. Upper layers forward
the canonical continuation or terminal failure; they do not maintain a second
reason/category/fallback mapping.

The terminal must agree bidirectionally with the signed public response:
success requires `ok`, authorization failure requires `denied`, and every
other canonical failure requires `unavailable`. Relay rejects any contradictory
projection rather than signing it.

The dormant v1 response counter shape can encode only integers. If a canonical
terminal contains `null` for a counter group whose downstream evidence is
unknown, Relay rejects the legacy response instead of allowing a projector to
replace the unknown fact with zero. Public response v2 remains the separate
cutover that can transport those `null` counters.

## Parent-owned preflight and provider

`createGovernedReadLeaseWorker()` is the persistent Shim controller. It:

1. rejects a second attempt before provider execution;
2. appends `NATIVE_DISPATCHED` with one native start and zero primary writes;
3. runs production `preflight()` against the canonical read-only source;
4. rechecks the attempt deadline and races the injected provider wrapper
   against the smaller of its timeout cap and remaining attempt TTL, passing
   an `AbortSignal` and calling the wrapper at most once;
5. validates a finite vector whose dimension exactly matches the projection
   plan;
6. creates one owner-only attempt directory and fresh derived store;
7. launches and retains the exact child handle;
8. accepts only a response whose receipt chain has the parent prefix;
9. deletes the exact attempt directory only after child shutdown is proven.

No local fallback exists. A pre-provider rejection carries explicit zero
provider evidence only where the origin can prove downstream dispatch did not
occur. A Bridge transport failure cannot prove that its request was not
accepted before the response was lost, so provider/native counters remain
unknown. Neither registry metadata nor upper-layer error handling turns those
unknown fields into zero.

If a provider ignores abort, no store or child is created and later admission
remains closed until the exact provider promise settles. A provider result
that arrives at or after `deadline_at` is discarded before derived/native
work. Store creation failures latch `cleanupBlocked` only when a partially
created attempt directory cannot be removed; a failure that created no
resource, or whose partial resource was removed, does not poison later
admission.

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

Governance UDS tracks frame admission separately from processing completion.
Its deadline or a peer disconnect aborts the in-progress frame exactly once,
destroys the socket, and propagates one internal `AbortSignal` through
Governance, Bridge HTTP, Shim, the provider wrapper, and the controller-owned
child handle. A late handler result cannot increment accepted-frame counters or
write a response. If exact child shutdown cannot be proven after cancellation,
the existing cleanup latch retains the store and blocks later reads.

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
the envelope TTL. Expiring a full terminal record therefore restores admission
capacity without making an accepted identity replayable.
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
allowed-diary index. It requires actual index search calls when vectors are
loaded, reconciles call/success/failure and candidate counts, rejects ghost
candidate removal, and rejects returned chunk identifiers not seen in index
candidates. A manager-level result array cannot substitute for index evidence.

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

If graceful completion misses its deadline, the parent may send `SIGTERM` only
to the child handle it created. It never uses `SIGKILL` and never enumerates or
signals an unknown process. If shutdown or exact-store deletion cannot be
proven, the result is `worker_shutdown_incomplete`, the store is retained, and
the controller blocks every later read before provider execution.

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
- activate public attempt-v1 output or public response schema v2;
- change any public tool or input schema;
- authorize `_005`, deploy, release, publish, cutover, or merge;
- establish R5-O acceptance, production readiness, or `RC_READY`.
