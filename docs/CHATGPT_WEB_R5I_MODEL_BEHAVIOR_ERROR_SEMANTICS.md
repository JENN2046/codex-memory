# ChatGPT Web R5-I Model Behavior And Error Semantics

## Status

`R5_I_SOURCE_HARDENING_VALIDATED_RUNTIME_NOT_RUN_R5_H_MATRIX_UNCHANGED`

R5-I is a source, contract, test, and documentation change. It does not activate
the private runtime, read or write memory, call a provider, or amend the frozen
R5-H observation artifact.

## Baseline And Boundary

- source baseline: `main@c06c6959e40f0cc0b75f2fd24b5dd1986b434a1a`
- public ChatGPT MCP tools: six, unchanged
- public input and output schemas: unchanged and digest-locked
- authorization and diary ACL: unchanged
- VCPToolBox core: unchanged
- Edge/runtime mode: not activated by this stage

## Behavior Contract

The model-visible workflow now makes five decisions explicit:

1. `project_alias` and `requested_visibility` must be copied exactly from the
   user-provided task context.
   The frozen public input schema remains unchanged, while the signed request
   validator now fails closed before context issuance when
   `requested_visibility` is absent; no default visibility is inferred.
2. App names, connector names, URLs, OAuth client identifiers, opaque context
   references, workspace names, and guessed repository names are not aliases.
3. A missing alias or visibility produces one concise clarification, not
   probing or enumeration.
4. The first read attempt consumes the one-read workflow even when the result
   is empty, denied, unavailable, or a transport failure.
5. Every read result or transport failure is terminal: do not resolve again,
   switch read tools, or invent retry counts.

## Receipt-Backed Error Semantics

Model-visible projection distinguishes two evidence classes:

- a receipt-bound governed result, whose exact bounded status may be reported;
- a transport failure, for which no receipt-bound memory result exists.

A transport timeout must not be narrated as `empty`, `denied`, or
`unavailable`. Conversely, a receipt-bound `unavailable` result must not be
called a timeout. The Edge sanitizes error codes before including them in the
model-visible terminal guidance.

Internal Governance receipts bind only low-disclosure failure categories:

```text
context_denied
context_unavailable
read_denied
read_unavailable
session_inactive
session_expired
session_killed
one_read_already_consumed
session_authorization_rejected
response_suppressed_after_activation_recheck
```

These categories are committed into internal receipt digests. They do not add
fields to the public MCP schemas and do not expose aliases, diary names,
mapping values, private digests, raw memory, or secrets.

## Validation Contract

The R5-I negative matrix covers:

- exact alias/visibility selection and missing-scope clarification;
- identity-like value rejection in model guidance;
- all six frozen public schema digests;
- receipt-bound `resolved`, `found`, `empty`, `denied`, and `unavailable`;
- transport timeout, expiry, cancellation, generic unavailability, and unsafe
  error-code sanitization;
- all internal failure categories and invalid-category rejection;
- duplicate resolve/read suppression and terminal one-read stop guidance;
- low-disclosure projection.

Targeted tests pass `46/46`, the default suite passes `5841/0/8`, and
hardening passes `97/97 + 6/6`. `gate:mainline:strict` passes its offline
contract (`112/112`), test (`5841/0`), compare (`43/43`), and rollback
(`43/43`) subgates. Its overall result is intentionally not reported as PASS:
health is `UNAVAILABLE_SERVICE_INACTIVE` because this source-only stage did not
start the loopback service.

The CI-safe gate passes `5940 tests / 5932 pass / 0 fail / 8 skip` with `noNetwork`, `noDaemon`, and
`noProvider` all true.

## Preserved Evidence And Non-Claims

The existing R5-H 20-session artifact remains immutable and unchanged. R5-I
does not reclassify its sessions, fill its missing 12/8 matrix, or convert model
narration into receipt evidence.

R5-I does not claim runtime behavior proof, automatic tool selection,
automatic-first-task use, production readiness, release readiness, deploy
readiness, or cutover readiness. Any exact-head private ChatGPT verification is
a separate runtime/provider/read authorization boundary.
