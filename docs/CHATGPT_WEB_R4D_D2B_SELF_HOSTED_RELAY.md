# ChatGPT Web R4-D D2B Self-Hosted Binding And Outbound Relay

Status: `SOURCE_VALIDATED_PRIVATE_EXACT_BINDING_BLOCKED_PUBLIC_ORIGIN_MISSING`

Task: `CM-2140`

Validation: `CMV-2225`

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

## Outcome

D2B replaces the Render-only host assumption with an explicit self-hosted
private-development amendment and implements the local outbound Relay client.
The tracked contract is ready; exact private activation is not complete because
no canonical public HTTPS origin reference is currently bound. The validator
rejects placeholders, IP origins, and non-public names, so deployment does not
fall back to a bare server address or an unowned wildcard-DNS service.

```yaml
self_hosted_amendment_contract: pass
outbound_https_relay_client: pass
local_uds_forwarding: pass
relay_inbound_listener: false
edge_relay_signing_authority_separated: pass
owner_only_secret_references: pass
private_d1_prerequisites_present: true
canonical_public_origin_reference_present: false
private_exact_binding_complete: false
external_service_changed: false
service_started: false
deployed: false
oauth_token_exchanges: 0
provider_calls: 0
memory_reads: 0
memory_writes: 0
production_ready: false
release_ready: false
cutover_ready: false
```

## Runtime Boundary

The Relay initiates canonical public HTTPS requests to the Edge and forwards an
already signed request to the existing local governance UDS. It has no inbound
listener and cannot load mappings, authorize diary scope, invoke a provider,
access storage, search native memory, or persist request/response state.

The outbound client:

- accepts only a canonical public DNS HTTPS origin;
- uses standard Node TLS verification and does not expose a certificate-bypass
  option to runtime configuration;
- authenticates every claim/ack/state/complete operation with an owner-provided
  bearer reference;
- rejects redirects and non-JSON or oversized responses;
- verifies both the Edge request and issuer-scoped principal assertion with the
  configured Edge Ed25519 public key;
- signs the zero-counter response with a distinct Relay Ed25519 private key;
- emits only bounded lifecycle metadata, never request/response bodies,
  authorization material, claim tokens, arguments, nonces, or UDS paths.

Runtime authority accepts secret material only through owner-only `file:`
references beneath a dedicated owner-only root. Edge and Relay key reuse, key
ID reuse, insecure permissions, paths outside the root, non-Ed25519 material,
missing binding references, and placeholder binding digests fail closed.

## Self-Hosted Amendment

The v1 amendment freezes:

```text
private single operator
  -> self-hosted private VM
  -> isolated non-root container
  -> host-loopback publish only
  -> separate reverse-proxy vhost
  -> exact Auth0 predefined public client / PKCE S256
  -> exact resource == public origin
  -> outbound HTTPS Relay -> local UDS
```

The canonical digest covers the entire exact private amendment, including the
previous binding digest, ownership, origin/resource, issuer/discovery, source
identity, all four Edge-private/Edge-public/Relay-private/Relay-public signing
authority references, lockfile and built Edge artifact digests, private
exact-value fingerprints, and rollback references. The public receipt
does not return exact values or the digest.

The existing Windows current-user private store and all six original D1
references were found present through a value-free audit. The D2B-specific
public-origin, Edge-public-key, Relay-private-key, UDS, and previous-host-config
references are not yet bound. No credential value or private-store content was
read or printed.

## Validation

```yaml
all_r4_tests: 64/64
d2b_tests: 7/7
canonical_ci_selected_external_tests: 13/13
default_tests: 5798
default_pass: 5790
default_fail: 0
default_skip: 8
hardening_primary: 97/97
hardening_secondary: 6/6
schema_digest_bound: pass
redacted_example_activation_ready: false
authenticated_outbound_https_to_temporary_uds: pass
signed_zero_counter_completion: pass
url_and_token_negatives: pass
owner_only_file_and_key_reuse_negatives: pass
import_fences: pass
candidate_default_activation: false
```

Official contract references:

- [Authenticate with OAuth](https://developers.openai.com/apps-sdk/build/auth/)
- [Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server/)
- [Deploy your app](https://developers.openai.com/apps-sdk/deploy/)

## Next Gate

Jenn must select a stable DNS name she controls for the private Edge and bind it
to the server before the exact D2B private amendment can be frozen. D2C may then
build and pin the exact committed image, stage isolated container and reverse-
proxy configuration, validate rollback/coexistence, and perform the authorized
health contract. D3 OAuth discovery/resource/token canary follows only after
D2C passes.

No real memory is allowed in D2B, D2C, D3, or D4. Production, release, cutover,
deploy-ready, and readiness claims remain false.
