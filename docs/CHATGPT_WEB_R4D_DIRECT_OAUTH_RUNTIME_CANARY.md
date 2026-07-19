# ChatGPT Web R4-D Direct OAuth Runtime Canary

Status: `D2C_D3_D4_DIRECT_CANARY_PASS_ZERO_MEMORY`

Task: `CM-2141`

Validation: `CMV-2226`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

## Outcome

The private-development Direct HTTPS route passed its first real external
runtime canary. A single isolated Edge container served the protected-resource
metadata and stateless MCP endpoint behind an existing reverse proxy. Auth0
predefined-public-client PKCE bound one Jenn operator to the exact resource and
the single `memory.read` scope. The authenticated canary called only
`initialize` and `tools/list`.

```yaml
private_exact_binding: pass
source_and_artifact_identity: pass
rollback_retained: true
isolated_edge_container: pass
host_loopback_publish: true
public_tls_health: pass
protected_resource_metadata: pass
anonymous_mcp_rejected: true
oauth_pkce_s256: pass
operator_binding_loaded: true
authenticated_requests: 2
candidate_tools_discovered: 6
candidate_tools_read_only: true
tool_calls: 0
relay_requests: 0
memory_reads: 0
memory_writes: 0
provider_calls: 0
native_invocations: 0
local_fallbacks: 0
durable_mutations: 0
raw_memory_returned: false
secret_values_returned: false
```

## Execution Boundary

The runtime operation was limited to one private-development VM and one
stateless Edge container. The container is non-root, publishes only to host
loopback, and is reached through a dedicated TLS virtual host. Existing
unrelated containers were not changed. Runtime authority is supplied by
owner-only private references; exact origin, issuer, client, operator, key,
token, binding digest, and artifact digest values remain outside Git.

The operator-binding activation exposed an important container-runtime fact:
restarting an existing container does not reload its creation-time `--env-file`.
The bounded fix recreated only the stateless Edge container with the same
image, isolation, limits, port, and secret mount. A bounded readiness wait was
also added to the private installer so container startup is not mistaken for
immediate HTTP readiness.

## OAuth And MCP Proof

The Auth0 resource server uses RS256, the exact public MCP resource, and only
`memory.read`. The Native public client uses PKCE S256 and a loopback callback
for the private operator canary. One D3 authorization-code exchange was used to
validate signature, issuer, audience, client, scope, time, and operator
fingerprint before the access token was stored in the owner-only private store.

D4 then made exactly two authenticated MCP requests:

1. `initialize`;
2. `tools/list`.

The returned profile contained exactly six candidate tools. Every descriptor
was read-only and bound to the single OAuth scope. No tool was invoked, so this
stage proves external OAuth and tool discovery only; it does not prove ChatGPT
App attachment, Widget rendering, memory recall, relevance, or automatic tool
use.

## Validation

```yaml
focused_r4_tests: 65/65
default_tests: 5798
default_pass: 5790
default_fail: 0
default_skip: 8
hardening_primary: 97/97
hardening_secondary: 6/6
schema_and_binding_validator: pass
import_fences: pass
git_diff_check: pass
independent_private_runtime_artifact: present
```

## Non-Claims And Next Gate

The outbound Relay and local governance UDS were not activated for this
canary. No ChatGPT App was created or attached. No memory, provider, native
search, fallback, write, migration, release, production deploy, or cutover
action occurred.

The next gate is R4-E: bind one private single-operator ChatGPT App to the
validated Direct HTTPS endpoint and prove OAuth login, six-tool discovery, the
minimal Widget shell, and one `memory_overview` zero-memory probe with the full
signed zero-counter receipt chain. R4-F governed live recall remains separately
authorized and closed.

Production-ready, release-ready, deploy-ready, cutover-ready, and automatic
first-task-use claims remain false.
