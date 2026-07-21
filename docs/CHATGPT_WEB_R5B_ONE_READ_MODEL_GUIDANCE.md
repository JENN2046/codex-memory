# ChatGPT Web R5-B One-Read Model Guidance

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Source status: `IMPLEMENTED_LOCAL_VALIDATION_RUNTIME_DOGFOOD_NOT_PERFORMED`

R5-B narrows model behavior around the existing R4-G one-context/one-read
authorization. It does not add a tool, change an input or output schema, move
registry or mapping authority to the Edge, or weaken the runtime enforcement
that remains authoritative even when a model ignores guidance.

The change addresses two bounded R5-A usability findings:

- a model may invent or vary the project alias or visibility before the first
  successful context resolution;
- after one read completes or returns a terminal bounded status, a model may
  try another read tool and misdescribe the expected one-read rejection as a
  data-plane outage.

## Model workflow contract

The Edge now returns server-wide MCP initialization instructions for the
cross-tool workflow:

```text
explicit project alias + explicit visibility
  -> resolve_memory_context exactly once
  -> exactly one intent-matched read tool
  -> answer the user and stop memory-tool use for that workflow
```

Alias and visibility are copied exactly from user-provided task context. The
model must not normalize, suffix, enumerate, or probe alternatives. If either
value is absent, it asks one concise clarification rather than guessing.

After resolution, the read choice is intentionally disjoint:

- `memory_overview`: bounded count or status only;
- `search_memory`: one specific semantic fact;
- `audit_memory`: bounded access or receipt categories;
- `prepare_memory_context`: one task-start context package.

The first read result is terminal for the workflow whether it is successful,
empty, denied, unavailable, or an error. Model-visible result text tells the
model to answer from that bounded result and not call another read tool or
resolve again. `render_memory_scope` remains an optional display-only tool and
does not authorize or trigger another read.

## Authority and disclosure boundary

The instructions and descriptions contain no registered alias list, diary
name, registry contents, mapping value, private digest, operator identity, raw
memory, token, or provider response. The Edge still cannot enumerate projects
or decide access. Governance continues to enforce the exact principal,
project, visibility, context, TTL, and one-read lease before provider/native
execution.

The six public tools remain exactly:

```text
resolve_memory_context
memory_overview
search_memory
audit_memory
prepare_memory_context
render_memory_scope
```

Tests bind every public input/output schema to its pre-R5-B canonical digest,
so this metadata and result-text improvement cannot silently expand the public
contract.

## Validation and non-claims

R5-B source validation covers server instructions, intent-specific tool
descriptions, terminal success and unavailable result guidance, low-disclosure
text, the unchanged six-tool list, and unchanged schema digests.

Official Apps SDK guidance explicitly permits MCP initialization
`instructions` for cross-tool workflows and constraints, and recommends precise
tool descriptions for discovery. See the official
[MCP server concepts](https://developers.openai.com/apps-sdk/concepts/mcp-server#protocol-building-blocks)
and [tool design guidance](https://developers.openai.com/apps-sdk/plan/tools/).

Metadata can improve selection but cannot guarantee model behavior. A later
private-development dogfood run must measure first-resolution success and
post-read retry frequency from the exact merged source. This document does not
claim automatic tool selection, runtime activation, production readiness,
release readiness, deploy readiness, or cutover readiness.
