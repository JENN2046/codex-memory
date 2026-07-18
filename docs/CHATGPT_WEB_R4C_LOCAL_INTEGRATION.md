# ChatGPT Web R4-C Local Edge/Relay Integration

Status: `IMPLEMENTED_LOCAL_REFERENCE_RUNTIME_EXTERNAL_RUNTIME_FALSE`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Task / validation: `CM-2137` / `CMV-2222`

Date / timezone: `2026-07-19` / `Asia/Shanghai`

R4-C implements the frozen local reference topology with actual loopback HTTP
and a temporary Unix-domain socket. It remains a non-default, non-activated
candidate. It does not read active config, start the active codex-memory
service, expose a public endpoint, configure OAuth, call a provider, invoke
VCP, or access real memory.

```text
synthetic caller
  -> Edge at 127.0.0.1:ephemeral
  <- outbound Local Recall Relay
  -> temporary test-owned UDS
  -> strict injected synthetic governance double
```

## Runtime Boundaries

The Edge listener is statically and dynamically bound to `127.0.0.1` with port
`0`. Its request queue, claim leases, acknowledgements, cancellations, and
responses exist only in bounded process memory. It has no config, filesystem,
storage, provider, VCP, mapping, diary, or body-logging import.

The Relay accepts only the canonical `http://127.0.0.1:<port>` Edge origin,
with or without its normalized root-path `/`. It claims
and acknowledges work over loopback HTTP, forwards the already validated
signed envelope over an explicitly injected temporary UDS, and returns the
signed response to the Edge. It owns no scope authorization, mapping, storage,
provider, global search, or service listener.

The active package entrypoints are scanned transitively and do not import the
candidate. File-specific import-fence exceptions allow only:

- `node:http` in the exact loopback Edge and loopback Relay client files;
- `node:net` in the exact UDS client file;
- one exact `server.listen(0, '127.0.0.1')` call.

Moving or mutating these capabilities to another file, host, or port fails the
static gate.

## Integration Proof

The focused R4 matrix passes 38 tests: 23 retained R4-B contract/synthetic
checks and 15 R4-C runtime integration checks. R4-C proves:

```yaml
actual_loopback_http: pass
temporary_uds: pass
claim: pass
ack: pass
request_expiry_before_forward: pass
first_stale_lookup_and_snapshot_purge: pass
expired_record_capacity_reclamation: pass
unacknowledged_claim_lease_expiry: pass
relay_reconnect_and_reclaim: pass
duplicate_submission_rejected: pass
duplicate_ack_rejected: pass
inflight_cancellation_before_governance_invocation: pass
response_request_correlation: pass
async_completion_terminal_state_recheck: pass
relay_edge_completion_timeout_alignment: pass
non_loopback_edge_rejected_before_network: pass
normalized_loopback_root_url: pass
uds_split_multibyte_utf8: pass
uds_frame_completion_before_peer_eof: pass
listener_alias_bypass_rejected: pass
body_log_absence: pass
candidate_activated: false
external_runtime_used: false
durable_remote_state_written: false
```

The positive flow performs synthetic context resolution followed by a
synthetic empty `memory_overview`. Receipt-chain and request/response bindings
are validated at both Relay and Edge. Runtime event sinks receive only bounded
state metadata (`component`, event, opaque request id, state, attempt, and
bounded error code); request bodies, response bodies, tool arguments, query,
nonce, claim token, context values, and socket paths are absent.

```yaml
provider_calls: 0
native_invocations: 0
local_fallbacks: 0
primary_memory_writes: 0
derived_index_writes: 0
other_durable_mutations: 0
unrestricted_native_searches: 0
real_memory_reads: 0
raw_disclosure: false
```

Validation on the final local diff:

```text
focused R4-B/R4-C matrix: 38/38 pass
npm test -- --summary:     5764 pass, 0 fail, 8 skip
npm run test:hardening:    97/97 + 6/6 pass
architecture validator:    pass
import-fence validator:    pass
current-facts drift:       pass
ledger consistency:        pass
docs validation:           pass
git diff --check:          pass
```

All filesystem mutation in the proof is limited to a uniquely created
temporary test root and its temporary UDS entry; the harness removes that root
on close. No repository runtime data, config, logs, memory store, or provider
state is read.

## Non-claims And Next Gate

R4-C proves a local reference transport and failure semantics only. It does not
prove external HTTPS, OAuth discovery/login, ChatGPT control-plane
compatibility, automatic first-task tool use, live recall, relevance, or
readiness.

R4-D is the next stage and crosses external auth/runtime configuration. It
requires Jenn's new exact authorization before any host, IdP, resource,
audience, scope, PKCE, credential reference, public URL, service, or external
runtime action. Production, release, deploy, cutover, and readiness remain
false.
