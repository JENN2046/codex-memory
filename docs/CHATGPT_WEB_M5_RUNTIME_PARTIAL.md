# ChatGPT Web R3 M5 runtime partial receipt

Observed: 2026-07-17 (Asia/Shanghai)

Result: `PARTIAL` / `BLOCKED_AT_TUNNEL_DOCTOR_AUTH_CLASSIFICATION`

This receipt records only the low-disclosure M5 evidence completed in Jenn's
dedicated `codex/chatgpt-r3-m2-uds` worktree. It is not ChatGPT reachability,
Tunnel lineage, production, release, or cutover evidence.

## Tunnel client supply chain

```yaml
binary_identity: go.openai.org/api/tunnel-client/cmd/client
binary_version: 0.0.9
binary_git_revision: 62b9b42f698ec5319d2115e0c0ff1dcf6557d7ae
binary_sha256: e732ecdb53606b2d3a26543c54318f43390bd274e59cda0d860daeddfd4f5aaf
linux_amd64_archive_sha256: eab94825dbd589e938a6a7ba5cd74bf0becaa3bef0e655f4438a0f75fddfbc8f
archive_checksum_manifest_match: true
secret_material_included: false
```

The binary identifies itself as the OpenAI MCP control-plane Tunnel client,
and its embedded Go module path is under `go.openai.org`. The archive digest
matches the installed checksum manifest. No Tunnel log, runtime key, admin key,
token, or secret value was read or emitted.

## Local UDS/HTTP integration

An isolated operator-owned runtime root was used. The service exposed no TCP
listener and was stopped after the gate.

```yaml
transport: unix_domain_socket_streamable_http
socket_directory_mode: "0700"
socket_mode: "0600"
bridge_auth_rejection: pass
v0_tools:
  - memory_overview
v1_tools:
  - audit_memory
  - memory_overview
  - search_memory
v1_tool_invocation_performed: false
public_mcp_schema_expanded: false
```

The M1 runtime gate was narrowed: a new explicit local binding may open only
the v0 `memory_overview` zero-touch probe. Setting the same binding for v1 or
v2 does not permit runtime invocation.

## Local nonce probe

The local UDS path completed one nonce call. This was not a ChatGPT/Tunnel E2E
call and therefore does not satisfy M5-T4.

```yaml
probe_status: success
probe_nonce_digest_matched: true
raw_nonce_returned: false
local_memory_read_performed: false
native_memory_call_performed: false
provider_call_count: 0
local_fallback_count: 0
durable_memory_mutation_count: 0
operational_audit_write_count: 0
source_runtime: none
```

## Tunnel identity and explicit HTTP fallback

Jenn created a dedicated Tunnel and a restricted runtime key outside Git. A
read-only control-plane lookup matched the expected Tunnel name and returned
one organization attachment and one workspace attachment. Exact identifiers,
key material, and private profile values remain outside this receipt.

The verified official `tunnel-client` `0.0.9` profile schema rejects the R3
freeze-candidate `unix_socket` field. Under Jenn's explicit M5 UDS/HTTP runtime
authorization, a separate default-off TCP fallback was therefore added and
tested:

```yaml
bind: 127.0.0.1_only
public_listener: false
profile: chatgpt_web_transport_probe_v0_only
bridge_auth: separate_file_bound_header
transport_auth: separate_file_bound_header
auth_material_distinct: true
origin_absent_or_allowlisted_only: true
forwarded_headers: rejected
uds_default_changed: false
```

The real listener bound only to loopback. The private Tunnel profile loaded,
the local target was reachable, and no poller was started.

## Hard gate reached

`tunnel-client doctor` completed 12 checks as `PASS` and one optional plugin
check as `SKIP`, but classified the local bridge-authenticated target as an
OAuth-capable server because its unauthenticated reachability probe received
HTTP 401. It then failed `oauth_metadata` when the intentionally non-OAuth v0
profile returned HTTP 404.

This profile is frozen as private, single-operator, tunnel-bound, read/write
disabled, and not end-user authenticated. The R3 identity contract makes OAuth
an upgrade gate for multi-user, shared/published, private-visibility, mutation,
or user-specific authorization cases. Publishing fabricated OAuth metadata or
weakening bridge/transport authentication merely to satisfy `doctor` would
violate that contract.

Consequently, the following were not performed:

- no Tunnel poller start;
- no ChatGPT App creation/update or scan;
- no private/single-operator claim;
- no control-plane/App lineage claim;
- no ChatGPT E2E probe;
- no memory recall, provider call, fallback, or memory write.

Advancement requires an official Tunnel client mode that treats static
file-bound local transport authentication as distinct from end-user OAuth, or
an approved identity-contract change. Secret values must remain outside Git
and command output.

## Closeout validation

```yaml
targeted_chatgpt_transport_tests: 20_pass_0_fail
npm_test: pass
npm_test_all: pass
gate_mainline_strict: pass
dedicated_loopback_listener_after_closeout: absent
dedicated_tunnel_poller_after_closeout: absent
memory_read_count: 0
memory_write_count: 0
native_invocation_count: 0
provider_call_count: 0
local_fallback_count: 0
durable_mutation_count: 0
chatgpt_e2e_claimed: false
production_ready_claimed: false
release_ready_claimed: false
cutover_ready_claimed: false
```
