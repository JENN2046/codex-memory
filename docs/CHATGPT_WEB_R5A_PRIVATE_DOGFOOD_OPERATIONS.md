# ChatGPT Web R5-A Private Dogfood Operations And Observation

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Source status: `IMPLEMENTED_DEFAULT_CLOSED_RUNTIME_OBSERVATION_NOT_YET_PERFORMED`

R5-A keeps the R4-G one-context/one-read authorization boundary and adds a
bounded owner-only observation mode. It does not add an MCP tool, change a
public input schema, enable memory write, or move project/mapping authority to
the Edge or Relay.

The public App remains aligned with the official Apps SDK guidance to keep
each tool tied to one intent, annotate read-only behavior accurately, and keep
model-visible structured output concise. R5-A's operations belong outside that
surface. See the official [tool design guidance](https://developers.openai.com/apps-sdk/plan/tools/),
[MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server/),
and [Apps SDK reference](https://developers.openai.com/apps-sdk/reference/).

## Private operation path

```text
owner-only local CLI
  -> mode-0600 local control UDS
  -> startup-bound R5-A in-memory observer
  -> existing R4-G session activation controller
  -> existing Governance UDS and bounded selected-diary read
```

The R5-A CLI supports only `activate`, `status`, and `kill`:

```bash
node ./src/cli/chatgpt-r5-private-dogfood.js status --json
node ./src/cli/chatgpt-r5-private-dogfood.js activate --visibility project --ttl-seconds 300 --json
node ./src/cli/chatgpt-r5-private-dogfood.js kill --reason operator_requested --json
```

`activate` declares one `meaningful_task_unprompted` observation. It is meant
to be issued immediately before a meaningful ChatGPT task that does not name or
request a memory tool. That constraint makes the observed tool-selection rate
honest; a directly prompted memory call must not be counted as automatic
selection.

R5-A observation is enabled only by startup-bound private configuration:

```yaml
CODEX_MEMORY_R4_COUNTER_MODE: session_scoped_live_read_v1
CODEX_MEMORY_R5_PRIVATE_DOGFOOD_ENABLED: "true"
```

The flag participates in the canonical private Governance binding digest.
When enabled, the older v1 control protocol may still inspect status or kill a
lease for rollback compatibility, but it cannot activate an unobserved lease.
Restart loses both lease and observation state and returns inactive.

## Observation contract

The in-memory observer accepts at most 20 meaningful-task sessions and at most
25 provider calls per process. The authorized Governance request budget rises
from 20 to 40 only in this private mode, allowing at most the intended
`resolve_memory_context -> one read tool` sequence for 20 sessions. The public
six-tool surface does not change.

The owner-only status projection records only:

- session counts and whether any memory tool was selected;
- `resolve` and read selection counts;
- `resolve -> read` sequence count;
- bounded per-session tool names, total latency, timeout/error category,
  result count, maximum low-disclosure relevance, and provider/native counts;
- aggregate fallback, primary/derived write, other durable-mutation, and
  unrestricted-search counters. The existing low-disclosure audit receipt is
  counted as an other durable mutation and is not a memory write.

It never records task text, query text, result summaries, raw memory, diary
names, project or mapping values, private digests, tokens, request/response
bodies, or provider responses. The observer is memory-only. A final owner-only
artifact may persist the low-disclosure projection outside Git after runtime
verification.

## Fail-closed rules

- every process starts inactive;
- one activation authorizes one context and one read for the exact bound
  principal/project/visibility and a 30–300 second TTL;
- 21st session and provider call 26 are rejected;
- unobserved v1 activation is rejected while R5-A mode is enabled;
- primary-memory write, derived-index write, local fallback, or unrestricted
  native search rejects the result and marks the owner-only observation
  `emergency_stopped`, even when the one-read controller has already consumed
  its lease; the observer then latches closed for the rest of the process, so
  only a full Governance restart can permit another R5-A activation;
- a violating tool name and its low-disclosure counters are recorded before
  suppression, so the owner artifact cannot report a false zero for the event
  that stopped the run;
- public receipts remain low-disclosure and contain no observation authority;
- stop/restart clears activation and observation state.

Detection of a forbidden post-call counter suppresses the response but cannot
undo a provider-side effect that has already happened. Runtime dogfood must
therefore use the already indexed governed partitions and stop immediately if
any derived-index mutation is reported.

## Runtime gate and rollback

Source tests are synthetic and make no provider call or memory read/write.
Runtime observation may begin only from the exact merged main source and the
authorized private-development binding. At completion, the operator must issue
`verification_complete`, stop Governance/Relay, restore the retained
zero-memory binding, and verify the private App's health/OAuth/six-tool
contract.

This document does not claim that ChatGPT always selects memory tools, nor does
it claim production, release, deploy, cutover, or readiness status.
