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
| `AUTHORIZED` | Governance | Resolve the injected trusted scope before bridge/provider/native work. |
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

## Parent-owned preflight and provider

`createGovernedReadLeaseWorker()` is the persistent Shim controller. It:

1. rejects a second attempt before provider execution;
2. appends `NATIVE_DISPATCHED` with one native start and zero primary writes;
3. runs production `preflight()` against the canonical read-only source;
4. rechecks the attempt deadline and calls the injected provider wrapper at
   most once only while the lease remains live;
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

The parent accepts only an exact child response shape whose working set extends
the parent prefix, counters reconcile, success ends at a completed
`SCOPE_POSTCHECK`, failure ends at a canonical child-owned failed stage, and
every result item matches the bounded low-disclosure projection. Invalid child
evidence is treated as incomplete shutdown evidence; its store is retained and
later reads remain blocked.

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
bytes are unchanged.

The exact-writer authority job separately checks out and verifies unmodified
VCP commit `555b3b538f6eb736e530c2912de678c5941f9985`. Real
`KnowledgeBaseManager.initialize`, `pendingFiles/_flushBatch`, update, and
delete output now flows through the production lease controller and actual
child process. The job proves:

- provider and native invocation counts are exactly one for the accepted read;
- primary writes and fallback attempts are zero;
- hydration is one committed derived transaction;
- scope postcheck excludes the writer-created unauthorized diary;
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
