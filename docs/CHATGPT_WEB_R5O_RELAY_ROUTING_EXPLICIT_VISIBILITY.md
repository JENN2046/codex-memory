# ChatGPT Web R5-O Relay Completion, Tool Routing, And Explicit Visibility

## Status

R5-O is a source-hardening and public-contract-clarification stage based on
`main@13f167358e4ce154e2af0248a396de3215adefaf`.

It combines two related corrections needed before another private runtime
observation:

1. a governed native read could complete locally but fail before the Edge
   accepted the signed response;
2. model-visible tool guidance still left room for ambiguous read selection,
   inferred scope, follow-up reads, and omitted visibility.

No live runtime, provider, private configuration, or memory operation was
performed by this stage.

## Relay Completion

The Relay completion path now:

- derives the signed response TTL from the accepted request's remaining
  lifetime, so response expiry never exceeds request expiry;
- uses a 15-second default UDS read budget for governed provider reads;
- classifies an incomplete UDS response as an availability error so the daemon
  remains alive and backs off before polling again;
- emits injectable bounded lifecycle events for acknowledge, process, and
  completion;
- retains no request identifier, response body, raw memory, or secret value in
  the low-disclosure observer.

The availability classification does not replay the acknowledged one-read
request. That request remains terminal and awaits Edge expiry; the next service
loop is a new claim attempt.

The injectable observer library distinguishes current in-flight, cancelled,
expired, accepted, and locally unconfirmed completion states, including mixed
request sequences. A complete-call timeout means only that the Relay did not
observe Edge acceptance; the Edge may have accepted the response before its
reply was lost. At the reviewed R5-O baseline, canonical `outbound-main.js`
did not inject or expose this observer, so R5-O correctly made no operational
completion-stage telemetry claim.

CM-2157 later added source-only canonical injection and an exact-key,
owner-only, read-only snapshot UDS. No real path was configured and no real
runtime was started or verified. See
`docs/CM2157_CANONICAL_RELAY_OBSERVER_WIRING.md`.

## Model-Visible Tool Routing

The model-visible workflow now selects one read before context resolution,
bounded by what each public output schema can actually return:

- stored fact, decision, event, record, or content: `search_memory`;
- overview response status and `item_count`: `memory_overview`;
- audit response status and `item_count`: `audit_memory`;
- named task-start response status and `item_count`:
  `prepare_memory_context`.

`search_memory` terminal guidance preserves its distinct output vocabulary:
`result_count` remains `result_count`, and each returned `results[].summary`
and `results[].relevance` is explicitly available to answer the user. It does
not rename the search count to `item_count`, expose `result_ref` as content, or
permit a dereference or follow-up read.

The three bounded-status tools do not return memory-category counts, access,
receipt, scope, visibility, audit-event, or task-context content. A stored
summary or fact must use `search_memory`. The model must not promise a detail
that is absent from the selected tool's public output schema.

After both scope values are present, the workflow is:

```text
resolve_memory_context once
-> wait for project_context_ref
-> call the preselected read once
-> answer from that result
```

Every receipt-bound result or transport error consumes the workflow. The model
must not infer an uncalled tool's state, dereference `result_ref`, fill missing
categories, or perform a verification read.

## Private Observation Contract Compatibility

The owner-only private dogfood observation contract is versioned separately
from the public MCP schemas. Adding `last_session.error_detail_code` changes
its exact key set, so the current observation schema is now `3`, not `2`.

The staged compatibility rules are:

- observation v2 has the prior exact `last_session` key set without
  `error_detail_code`;
- observation v3 requires `error_detail_code`, which may be `null` or a
  validated low-disclosure receipt classification;
- the current CLI validates v2 and v3 against their separate exact key sets;
- a control-schema-2 client receives an observation-v2 projection from the new
  runtime, so an older CLI does not see an unexpected field;
- a control-schema-3 client receives observation v3, while the new CLI also
  accepts observation v2 from a not-yet-restarted prior runtime;
- the new runtime rejects a stale observation-v2 producer on its own
  control-schema-3 path instead of silently downgrading that current path;
- current `status` and `kill` CLI requests use control schema 3; the explicit
  legacy unclassified activation path remains control schema 2.

Missing v3 fields, extra v2 fields, and unknown observation versions fail
closed. The accepted response/observation version pairs are `2 -> 2`,
`3 -> 2` for a new CLI reading a prior runtime, and `3 -> 3`; `2 -> 3` is
rejected. The v2 projection omits only the new low-disclosure detail field; it
does not change counters, authority, activation state, or memory behavior.
This is not a public MCP schema or tool change and does not alter any of the
six public tool digests.

## Public Contract Change

The six public tool names remain unchanged:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

R5-O deliberately tightens the public input schema for
`resolve_memory_context`.

Before R5-O:

```json
{
  "required": ["project_alias"]
}
```

After R5-O:

```json
{
  "required": ["project_alias", "requested_visibility"]
}
```

The schema digest therefore changes from
`sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6`
to
`sha256:fe92ada83513b769a01d241fe1df483fcf3b9b0330b253cfa4c8a343b3093faf`.

This is not a public tool expansion, but it is a public contract change.
Clients that omitted `requested_visibility` now fail request-schema validation
before context issuance. The change is intentional because visibility must be
explicit and must not be inferred from a default, App identity, repository
name, or prior session.

R5-O is the independent contract exception required by the R4 freeze. The
compatibility choice is intentionally fail-closed rather than dual acceptance:
callers must supply `requested_visibility` before rollout. Rollback restores
`required: ["project_alias"]` and the prior digest; it requires no memory or
data migration.

`packages/chatgpt-r4-contracts/constants.js::SCHEMA_VERSION` remains `1` as an
intentional breaking policy exception. The signed request envelope shape is
unchanged, but the accepted `schema_version: 1` argument set is narrower
because `validateRequestEnvelope()` validates the newly required visibility.
This is therefore not merely descriptor metadata and is not backward
compatible for omission.

The coordinated rollout order is Edge first, Relay last: a new Edge always
sends visibility and remains acceptable to the prior Relay, while deploying
the new Relay first could reject a request from the prior Edge. Rollback is
Relay first, Edge last. The explicit prior/current digest pair, signed-envelope
positive/negative tests, taskbook exception, and deployment order bind this
decision. A future independent tool-contract version may replace this v1
exception; R5-O does not claim that migration has been implemented.

R5-I and R5-K described the prior schema-compatible omission behavior. Their
documents now carry explicit R5-O supersession notes; they are historical
stage records, not current caller guidance.

## Validation

Local validation in the restricted agent sandbox:

- R5-O contract tests: `6/6` pass;
- all R5 plus synthetic E2E files: `8/8` pass;
- base R4 contract tests: `9/9` pass;
- Relay tests: `6/7` pass, with the UDS-listener case blocked by sandbox
  `EPERM` before its assertions;
- selected remaining-TTL, expiry-race, observer, and availability Relay cases
  pass without a listener.

GitHub Actions run `30236898520` passed on remediation head
`56bca4221b036965aa2a04f39b997cb20bd9deaf`, including dependency
installation, tests, release-gate summary, and profile CLI smoke. Exact-head
automated review then identified a terminal-guidance mismatch that renamed the
search count to `item_count` and failed to authorize use of returned summaries.
The source and targeted tests now correct that mismatch; the next pushed head
must pass CI again.

## Review Boundary

Independent review must cover:

- the intentional public input-schema tightening and compatibility impact;
- exact alias and visibility fail-closed behavior;
- one-resolve/one-read terminal enforcement;
- Relay TTL and timeout compatibility;
- no-replay semantics for incomplete UDS responses;
- observer mixed-sequence state and completion-uncertainty semantics;
- remaining-TTL response expiry and processing-time expiry classification;
- the reviewed PR #61 head's lack of canonical observer wiring;
- the intentional schema-v1 accepted-set break and Edge-first/Relay-last
  rollout order;
- preservation of the six public tool names and zero-memory default;
- preservation of `search_memory` result fields in terminal guidance without
  enabling `result_ref` dereference or another read;
- observation-v2/v3 exact-key compatibility during staged local
  runtime/CLI updates.

The completed source review and its delivery blockers are recorded in
`docs/CHATGPT_WEB_R5O_PUBLIC_CONTRACT_INDEPENDENT_REVIEW.md`.

## Non-Claims

R5-O does not claim:

- live private-runtime verification;
- automatic memory-tool selection in every ChatGPT session;
- operational Relay observer telemetry at a real private exact-head runtime;
- replay of an acknowledged request after an incomplete UDS response;
- a separate public tool-contract version or wire-version migration;
- production, release, deploy, cutover, or RC readiness;
- public write activation;
- completion of V8 or the full memory plan.

Primary/source memory writes, provider calls, live memory reads, public tool
expansion, release, deploy, and merge are all outside this stage.
