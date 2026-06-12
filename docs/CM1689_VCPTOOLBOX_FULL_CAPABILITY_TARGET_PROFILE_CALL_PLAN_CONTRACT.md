# CM-1689 VCPToolBox Full-Capability Target/Profile Call-Plan Contract

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_VCPTOOLBOX_FULL_CAPABILITY_TARGET_PROFILE_CALL_PLAN_CONTRACT_SOURCE_ONLY_NO_RUNTIME`

## Purpose

CM-1689 turns the CM-1688 full-capability bridge route into a local source
contract.

The contract can represent full VCPToolBox read and write capability by profile
without calling VCPToolBox, reading VCP configuration, reading runtime memory,
or wiring Codex sustained conversation runtime behavior.

Added:

- `src/core/VcpToolBoxFullCapabilityBridgePlan.js`
- `tests/vcp-toolbox-full-capability-bridge-plan.test.js`

## Contract Decision

The source contract does not downgrade VCPToolBox to summary-only mode.

It supports these profiles:

| Profile | Contract capability |
|---|---|
| `observe-lite` | conservative read shape, compatibility with CM-1684/CM-1685 only |
| `observe-full` | full VCP read capability, no writes |
| `trusted-full-read` | full read capability for sustained Codex recall |
| `trusted-write-proposal` | full read plus write proposal planning |
| `trusted-full` | full read plus durable write call-plan capability |

`trusted-full` accepts planned VCP write actions such as `daily_note.write`,
`knowledge_base.write`, and `tagmemo.write`. The helper does not execute those
actions. It returns `planned_not_executed` operations and zero execution
counters.

## Source Contract

The helper requires a sanitized runtime target reference:

```text
target.kind
target.referenceName
target.locatorHashPresent=true
target.locatorValueIncluded=false
target.secretMaterialIncluded=false
```

Supported target kinds:

```text
local_checkout
service_url
mcp_server
cli
plugin_api
ipc
```

Supported source components:

```text
DailyNote
DailyNoteManager
KnowledgeBaseManager
TagMemo
TagMemoEngine
LightMemo
TDBKnowledge
DeepMemo
TopicMemo
MeshMemo
RAGDiaryPlugin
```

Supported read actions include native DailyNote, knowledge, TagMemo, LightMemo,
TDBKnowledge, DeepMemo, TopicMemo, MeshMemo, and RAGDiary routes. Supported
proposal/write actions are split so `trusted-write-proposal` can plan proposals
without durable writes, while `trusted-full` can plan durable VCP write actions.

## Boundary

CM-1689 is source/test/docs only.

It did not:

- find or inspect a live VCPToolBox runtime
- call VCPToolBox
- read `config.env`
- read `.env`
- read raw DailyNote, RAG, vector, prompt, or runtime store content
- perform broad scan/export/import
- write VCP memory
- call providers
- wire Codex sustained conversation runtime behavior
- expand public MCP tools
- claim production/release/cutover readiness

The helper rejects secret-shaped target fields such as endpoint values, bearer
tokens, API keys, config-env paths, and raw memory content fields without
echoing the submitted values.

## Validation

Targeted validation:

```text
node --test tests\vcp-toolbox-full-capability-bridge-plan.test.js
```

Result:

```text
10/10 passed
```

Coverage:

- accepts `trusted-full-read` without downgrading raw or structured VCP read
  capability
- accepts `observe-full` full-read/no-write plan
- accepts `trusted-write-proposal` proposal actions and rejects durable writes
- accepts `trusted-full` read/write call plan without execution
- rejects durable write actions in read-only profiles
- rejects missing target/principal fields
- rejects secret endpoint/raw/config-env-shaped fields without echoing values
- rejects requested actions beyond runtime call limit
- locks full-capability component/profile/action vocabulary
- proves the helper never performs runtime, provider, memory, or public MCP
  actions

## Next Step

Recommended next task:

```text
CM-1690 VCPToolBox full-capability runtime target locator preflight
```

That task should either consume an operator-provided VCPToolBox checkout path or
service endpoint reference, or implement a local no-secret locator preflight
that can discover candidate runtime targets without reading secret files.
