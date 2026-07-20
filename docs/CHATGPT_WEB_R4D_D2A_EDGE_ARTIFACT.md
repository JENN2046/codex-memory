# ChatGPT Web R4-D D2A External Edge Artifact

Status: `EXTERNAL_EDGE_ARTIFACT_VALIDATED_ACTIVATION_FALSE`

Task: `CM-2139`

Validation: `CMV-2224`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

## Outcome

D2A implements the host-agnostic Direct HTTPS Edge artifact without activating
it. The existing local Codex/Claude MCP surface is unchanged. No external
service or container was started, no token was exchanged, and no memory,
provider, native, fallback, or durable-write path was invoked.

```yaml
external_runtime_implemented: true
external_runtime_activated: false
official_mcp_sdk_used: true
candidate_tool_count: 6
public_local_tool_surface_expanded: false
container_built_locally: true
container_started: false
external_service_changed: false
token_exchanges: 0
real_memory_reads: 0
provider_calls: 0
production_ready: false
release_ready: false
cutover_ready: false
```

## Artifact Boundary

The external process contains only:

- official MCP SDK stateless Streamable HTTP transport using the standard SSE
  response mode;
- protected-resource metadata and an exact server-level OAuth challenge in the
  HTTP `WWW-Authenticate` header with explicit missing-token, invalid-token,
  and insufficient-scope error classes;
- Auth0 RS256/JWKS verification bound to exact issuer, resource/audience,
  predefined public client, `memory.read`, and one operator fingerprint;
- five read-only data tools and one render-only scope tool;
- immutable `text/html;profile=mcp-app` scope resource;
- bounded in-memory request broker and authenticated outbound Relay endpoints;
- Ed25519-signed request/response envelopes and mandatory zero-memory counters.

It cannot load diary mappings, invoke providers, search VCP, write memory, or
own durable remote state. Any response with a nonzero provider, native,
fallback, primary/derived write, other mutation, or unrestricted-search counter
fails the entire request.

## Runtime And Supply-chain Gates

Runtime authority fails closed unless:

- secret material is referenced by owner-only files under the dedicated secret
  root, never by plaintext environment values;
- public origins are canonical public HTTPS DNS names;
- the container publishes only through a host-loopback port acknowledged by
  the deployment boundary;
- Edge and Relay signing keys are Ed25519 and independently owned;
- binding, rollback, source, lockfile, and artifact identities are non-
  placeholder values;
- actual `package-lock.json` bytes match the expected SHA;
- the image's build-source file matches the expected exact commit.

The final image digest cannot be self-proven by a running container. It must be
verified against Docker build/deployment metadata before the container is
started.

The Dockerfile uses a digest-pinned Node base, a whitelist-only build context,
`npm ci --omit=dev --ignore-scripts`, root-owned read-only source identities,
a non-root runtime user, and a bounded health check. The local validation image
was not run and is not a frozen deployment artifact.

## Host Decision

A low-disclosure read-only preflight found the existing private VM technically
suitable with a coexistence gate: use a dedicated container, publish its port
only on host loopback, and add a separate reverse-proxy virtual host. Existing
services and ports must remain isolated. The preflight read no config,
environment, logs, secret values, or service names and performed no remote
mutation.

The existing D1 private binding is Render-specific. It must not be reused for
self-hosting. D2B must privately amend and revalidate host ownership, public
origin/resource, rollback references, Relay public signing identity, and local
Relay private signing authority before deployment.

## Validation

```yaml
focused_external_tests: 6/6
all_r4_tests: 57/57
default_tests: 5785
default_pass: 5777
default_fail: 0
default_skip: 8
hardening_primary: 97/97
hardening_secondary: 6/6
official_mcp_initialize_tools_resources_call: pass
oauth_prmd_challenge_and_exact_binding: pass
signed_zero_memory_relay: pass
proxy_oauth_signature_counter_config_negatives: pass
import_fences: pass
secret_reference_and_supply_chain_negatives: pass
pinned_nonroot_container_build: pass
container_start: not_run
external_health: not_run
direct_https_canary: not_run
```

Official implementation references:

- [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server/)
- [Build a custom UX](https://developers.openai.com/apps-sdk/build/chatgpt-ui/)
- [Define tools](https://developers.openai.com/apps-sdk/plan/tools/)
- [Apps SDK reference](https://developers.openai.com/apps-sdk/reference/)
- [Deploy your app](https://developers.openai.com/apps-sdk/deploy/)

## Next Gate

D2B is the next boundary: self-hosted D1 binding amendment and local outbound
Relay client authority. D2C deployment, D3 OAuth canary, D4 zero-memory
ChatGPT canary, real memory, production, release, deploy-ready, cutover, and
readiness claims are not authorized or proven by D2A.
