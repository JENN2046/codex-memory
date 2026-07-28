# Status

> Non-authoritative summary. Start work only from `CURRENT_STATE.md`.

## Pointer

- Current authority: `CURRENT_STATE.md`
- Machine companion: `.agent_board/CURRENT_FACTS.json`
- Current status: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`
- Active task: `CM-2159`
- Last completed lifecycle/governance task: `CM-2158 / CMV-2243`
- Accepted product baseline: PR `#61`, reviewed head `4680b4c1…`, merge
  `ef62d481…`, main CI run `30238902177`

## Open State

PR `#65` delivered the governed full-stack lifecycle controller. The exact V5
transition closed successfully at merge baseline `48ecfe1c…`, including the
owner-only reference-only schema-v5 profile adoption. PR `#66` then advanced
only governance surfaces, exposing that the whole-HEAD profile binding rejects
an unchanged runtime source after its own closeout.

`CM-2159` is the active source/test/docs repair. It introduces a versioned
runtime-source manifest and schema-v6 profile compatibility while preserving
whole-repository cleanliness, current-main, ancestry, provider, VCP, Edge,
configuration, credential, and write-free gates. No live runtime action is
authorized by this status.

The source-identity transition, R5-H matrix, R5-O private exact-head runtime
behavior, and fresh non-empty task-context relevance remain unclosed.

## Live Facts

Collect branch, HEAD, ahead/behind, current PR, and current CI through fresh
Git/GitHub queries. Current process health requires a separately authorized
low-disclosure runtime inspection. Do not commit dynamic values here.

## Boundaries And History

P3, secret, raw-memory, raw-output, runtime/provider, release/deploy, public MCP,
and readiness boundaries remain unchanged. Historical status is recoverable
through `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`.
