# ChatGPT Web R5-H Private ChatGPT Dogfood Window

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Source status: `IMPLEMENTED_DEFAULT_CLOSED_RUNTIME_DOGFOOD_NOT_YET_PERFORMED`

R5-H measures whether the private single-operator ChatGPT App selects and
stops the governed one-read workflow correctly during meaningful tasks. It
does not prove retrieval again: R5-G already established five successful
exact-head selected-diary reads. R5-H closes the remaining model-behavior gap
left by R5-B.

OpenAI's Apps SDK documentation treats tool names, descriptions, schemas,
annotations, and server instructions as model-selection inputs, while the
model still decides when to call a tool. Therefore source tests can validate
metadata but cannot claim automatic tool use. See the official
[MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server/),
[tool-design guide](https://developers.openai.com/apps-sdk/plan/tools/), and
[Apps SDK reference](https://developers.openai.com/apps-sdk/reference/).

## Boundary

R5-H keeps the existing architecture and public contract:

```text
private ChatGPT App
  -> six existing read-only candidate tools
  -> stateless Edge
  -> outbound Relay
  -> local owner-only Governance UDS
  -> one-context / one-read lease
  -> selected-diary native read
```

It adds only owner-control observation metadata. It does not add an MCP tool,
change a public input/output schema, enable memory write, copy ACL authority to
the Edge or Relay, or modify VCPToolBox core.

Every R5-H activation is classified outside the model-visible surface:

```text
memory_relevant  -> exact expected read tool is required
memory_irrelevant -> no memory tool is expected
scope_missing     -> the model should ask for alias/visibility, not guess
```

The classification and expected read tool are sent only through the mode-0600
operator control UDS. Prompt text, query text, response text, project/mapping
values, raw memory, diary names, provider responses, and tokens are never part
of the observation.

## Observation window

Use 20 fresh ChatGPT conversations with no direct request to call a memory
tool:

| Task class | Sessions | Expected behavior |
|---|---:|---|
| `memory_relevant` / `search_memory` | 4 | exact resolve, one semantic read, stop |
| `memory_relevant` / `memory_overview` | 3 | exact resolve, one overview, stop |
| `memory_relevant` / `prepare_memory_context` | 3 | exact resolve, one task-context read, stop |
| `memory_relevant` / `audit_memory` | 2 | exact resolve, one audit-category read, stop |
| `memory_irrelevant` | 4 | no memory tool |
| `scope_missing` | 4 | concise clarification; no alias/visibility probing |

Positive tasks provide the canonical alias and visibility as ordinary task
context but do not name a memory tool. Negative tasks are also meaningful user
tasks; they are not synthetic MCP requests.

The owner CLI keeps backward-compatible schema-2 activation and adds schema-3
classified activation:

```bash
node ./src/cli/chatgpt-r5-private-dogfood.js activate \
  --visibility project \
  --task-class memory_relevant \
  --expected-read-tool search_memory \
  --ttl-seconds 300 \
  --json

node ./src/cli/chatgpt-r5-private-dogfood.js activate \
  --visibility project \
  --task-class memory_irrelevant \
  --ttl-seconds 300 \
  --json
```

## New truthful metrics

Observation schema v2 adds bounded counts for:

- classified positive and negative sessions;
- exact first-resolution success;
- expected read-tool match;
- terminal stop after the first read result;
- resolve retries and wrong-first-tool selections;
- attempts made after the one-read lease was consumed;
- negative-task abstention and unexpected negative-task selection;
- per-read-tool selection counts;
- per-session safe workflow outcome, latency, timeout, result count, and
  maximum low-disclosure relevance.

The runtime records a post-consumption attempt before returning its existing
fail-closed response. That observation never authorizes a second read and must
not add provider/native counters.

## Evaluation

The ideal 20-session result is:

```yaml
exact_first_resolution_successes: 12
expected_read_tool_matches: 12
terminal_stop_sessions: 12
negative_abstention_sessions: 8
post_terminal_tool_attempts: 0
resolve_retry_sessions: 0
wrong_first_tool_sessions: 0
unexpected_negative_memory_selection_sessions: 0
timeout_count: 0
```

Behavioral misses with intact safety become
`R5_H_DOGFOOD_COMPLETE_WITH_USABILITY_FINDINGS`; they are not rewritten as a
runtime outage or a safety breach. Any primary-memory write, local fallback,
unrestricted search, missing derived-runtime evidence, receipt mismatch, raw
disclosure, or cross-scope result latches the observer closed and fails the
window.

## Runtime gate and rollback

Actual ChatGPT sessions require a separately exact runtime/provider scope. The
run must start from exact merged main and current private binding identities,
use the normal VCP startup cooldown, preserve bounded provider/read budgets,
and retain an owner-only non-Git artifact.

At completion or failure:

1. issue `verification_complete` kill;
2. drain authorized derived-runtime work;
3. stop Governance, Relay, and isolated shim;
4. restore the retained Edge `zero_memory` binding;
5. verify HTTPS health, OAuth, anonymous rejection, and six-tool discovery.

R5-H does not claim automatic-first-task guarantees, continuous activation,
production readiness, release readiness, deploy readiness, or cutover
readiness.
