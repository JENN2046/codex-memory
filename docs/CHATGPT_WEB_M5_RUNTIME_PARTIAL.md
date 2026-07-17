# ChatGPT Web R3 M5 runtime partial receipt

Observed: 2026-07-17 (Asia/Shanghai)

Result: `PARTIAL` / `BLOCKED_AT_TUNNEL_CONTROL_PLANE`

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

## Hard gate reached

The current WSL process environment and Windows User environment expose no
`CONTROL_PLANE_TUNNEL_ID`, `OPENAI_ADMIN_KEY`, or runtime-key environment
binding. The Tunnel client's local runtime-alias list is empty. A protected
runtime-key file exists, but a runtime key cannot create or list Tunnel CRUD
metadata and no target Tunnel ID is available for a safe read-only lookup.

Consequently, the following were not performed:

- no Tunnel poller start;
- no Tunnel creation or association;
- no ChatGPT App creation/update;
- no private/single-operator claim;
- no control-plane/App lineage claim;
- no ChatGPT E2E probe;
- no memory recall, provider call, fallback, or memory write.

Advancement requires a separately established codex-memory Tunnel ID plus a
runtime key authorized for that Tunnel, or a securely bound admin authority to
create it. Secret values must remain outside Git and command output.
