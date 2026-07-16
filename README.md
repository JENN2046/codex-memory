# codex-memory

Primary manual: [中文使用说明书](README.zh-CN.md)

`codex-memory` is the governed MCP bridge that lets Codex and Claude access
VCPToolBox native memory without making `codex-memory` the memory-intelligence
owner.

The Chinese manual is the canonical usage guide for the current deployment.
This English README is kept as a short project summary and compatibility entry
for package-level checks.

The product goal is governance: who may access memory, which scope and runtime
they may use, how much output can be disclosed, what evidence is recorded, and
how rollback stays bounded.

当前目标是让 Codex 与 Claude 通过 `codex-memory` 治理桥，受控、可审计地
使用 VCPToolBox native memory runtime。

Long-term goal and boundary documents:

- [Codex Memory Final Goal](docs/CODEX_MEMORY_FINAL_GOAL.md)
- [Capability Layer Model](docs/CAPABILITY_LAYER_MODEL.md)
- [Non-Claims](docs/NON_CLAIMS.md)
- [Near-Model Memory Plan Pack](docs/near-model-memory-plan-pack/00_README.md)
- [Memory Access Contract](docs/MEMORY_ACCESS_CONTRACT.md)

## Current Status

Current facts snapshot: `.agent_board/CURRENT_FACTS.json`.

Current primary work goal: Native Context and Contract Convergence.
The Phase 3 `prepare_memory_context` MVP is implemented as a default read-only
context package tool. Its recall gateway now uses the same governed native read
path as `search_memory`, then enters an audited local fallback only when the
configured native mode permits it. Every package identifies `vcp_native`,
`local_fallback`, or `local_compatibility`. This code-level convergence still
requires fresh live runtime proof. A rejected primary native recall does not
produce an accepted empty package: it fails closed with
`PREPARE_MEMORY_CONTEXT_RECALL_REJECTED`, `isError: true`, and
`source_runtime: vcp_native_unavailable`.
The Phase 4 local task-start wrapper is also present: it derives task context,
calls `prepare_memory_context`, injects a bounded summary when available, and
marks `memory_unavailable` when memory context cannot be prepared.
The Phase 5 fixture/local recall quality gate is present for
`prepare_memory_context`; it covers project facts, decisions, blockers, user
preference, stale/conflict risks, private/workspace isolation, and fallback
distinction without claiming live or production recall quality.
The Phase 6 proposal-only memory delta tool is also present:
`propose_memory_delta` stages low-disclosure task-end memory proposals with
validation, audit receipt, rollback posture, and an operator-only draft
`commit_memory_delta` contract. It does not commit memory, perform durable
mutation, call providers, call VCPToolBox runtime, or enable native write.
The Phase 7 local proof gate is present for operator-only full surface:
explicit env/operator configuration can expose `record_memory`,
`validate_memory`, `tombstone_memory`, and `supersede_memory` for local proof,
while hardened mode and the default surface remain read-only plus proposal-only.
This is not native write production proof.
The Phase 8 P8-T1 local native-write contract preflight is also present: it
defines `prepare_write`, `commit_write`, `verify_write`, and
`rollback_or_compensate` proof gates with exact approval, native side-effect
receipt, real-root durable write, audit, rollback, failure recovery, and
low-disclosure requirements. It does not execute native write, prove real-root
durable write, call VCPToolBox runtime, or claim production write readiness.
The Phase 8 real-root write readiness gate is present after P8-T1: it can mark
category-only approval request material as ready for future review when
real-root target evidence, rollback drill planning, failure recovery planning,
and low-disclosure audit planning are present. It does not submit approval
requests, accept approval, run `record_memory`, execute rollback or recovery,
or prove native write production.
The Phase 9 default runtime policy observation gate is present: it accepts only
the current read/context/proposal default as a policy hold, blocks default
runtime expansion without observation and external review, and stops L4 for any
attempt to make write, destructive, commit, provider/API, release/deploy/cutover,
or readiness behavior part of the default runtime. It does not expand the
default surface or prove 30-day observation/external review.
The Phase 10 release tag readiness policy gate is present: it evaluates
candidate milestone tag names, release note non-claims, and tag approval packet
evidence for read-only/context, operator-full-surface, and native-write-proof
milestones. It rejects full/production/complete-memory naming and performs no
actual tag, release, deploy, cutover, push, or readiness action.
The full plan-pack completion audit is now present: it maps Phase 0 through
Phase 10 plus the objective invariants into explicit evidence checks and
currently evaluates the plan pack as incomplete. The Phase 1 command gates have
current evidence via `npm run test:all` and `npm run gate:ci -- --json`.
Remaining missing evidence includes native-read, native-write, observation,
external-review, and tag-approval categories. This audit performs no runtime
write, native write, durable mutation, public MCP expansion, provider/API call,
real/private memory read, tag, release, deploy, cutover, push, or readiness
action.

Current active path:

```text
Codex or Claude
  -> vcp_codex_memory MCP on 127.0.0.1:7625
  -> codex-memory governed bridge
  -> VCP native shim on 127.0.0.1:7615
  -> VCPToolBox native memory
  -> WSL-local NewAPI provider on 127.0.0.1:3000
```

The live read path was previously observed through WSL-local NewAPI with a
production-provider read proof. This fix commit does not claim a freshly rerun
live proof; release review should require a new dated live-proof artifact before
treating the observation as current evidence. Real Codex client dogfood has
called:

- `search_memory`
- `memory_overview`
- `audit_memory`

Those tools are currently exposed as read-only. `prepare_memory_context` is
also exposed as a default read-only context package tool, and
`propose_memory_delta` is exposed as a default proposal-only tool. The legacy
`7605` service is kept as rollback while `7625` is observed in real use.

The governed contract now includes both Codex and Claude. Repository tests
cover identity/scope binding for both clients; the historical live dogfood
evidence is Codex-only, so Claude runtime completion is not claimed.

The default server MCP surface is read-only plus proposal-only: `tools/list`
exposes only `search_memory`, `memory_overview`, `audit_memory`,
`prepare_memory_context`, and `propose_memory_delta`, and `tools/call`
adapter-blocks hidden tools. Controlled mutation, commit, or write tools require
an explicit operator surface configuration before they are exposed. Native
writes still require exact operator approval, bounded rollback posture, and a
separate real-root write proof.

## Quick Start

Start or inspect the managed WSL-local native bridge:

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
```

Run the production-provider read proof:

```bash
npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

Manual low-disclosure native proof entry points:

```bash
npm run vcp-native:shim -- --vcp-root /path/to/VCPToolBox --kb-store /tmp/codex-memory-vcp-derived-store --diary-scope-mapping /path/to/mapping.json
npm run vcp-native:acceptance -- --endpoint http://127.0.0.1:7615/mcp/vcp-native --target-ref operator-vcp-toolbox-service-ref --include-read-suite --evidence-output /tmp/codex-memory-vcp-native-evidence.json
npm run vcp-native:acceptance -- --json --verify-evidence /tmp/codex-memory-vcp-native-evidence.json
```

Governed native reads are fail-closed unless both sides are startup-bound to
`diary_allowlist_v1`: the bridge must carry the expected mapping reference and
digest, and the shim must load the matching mapping with
`--diary-scope-mapping /path/to/mapping.json`. The repository contains only a
redacted example; it does not contain or derive a live diary inventory. See
[Diary scope enforcement v1](docs/DIARY_SCOPE_ENFORCEMENT_V1.md).

Read acceptance covers `search_memory` / `memory_overview` / `audit_memory`
only when the native target exposes shape-compatible tools for those public
response shapes. The included shim exposes `knowledge_base.search`,
`memory_overview`, and `audit_memory` for the read suite by default.
`prepare_memory_context` calls the governed `search_memory` path through the
shared recall gateway. Native results are projected into the context package;
local results appear only as `local_fallback` or `local_compatibility` and
cannot be mistaken for native results. Native rejection and transport failure
use `vcp_native_unavailable`; they are never labeled as successful
`vcp_native` context.
Task-start workflow wiring remains local and read-only; it does not perform
durable mutation or production write.
`propose_memory_delta` packages proposal-only staging and governance receipts;
`commit_memory_delta` is draft/operator-only and not public registered by
default.
Operator-only full surface proof is local and gated; it does not change Codex
default runtime policy.
Native write contract preflight is local and fail-closed; it defines the proof
shape for Phase 8 but does not execute real-root write or satisfy production
write proof.
Real-root write readiness gate is also local and fail-closed; it prepares the
approval-request readiness shape for future exact authorization, but it does
not submit approval material, execute write, run rollback/recovery drills, or
claim production proof.
Default runtime policy observation gate is local and fail-closed; it preserves
the read/context/proposal default and records that observation/review evidence
does not auto-expand the Codex default runtime.
Release tag readiness policy gate is local and fail-closed; it can evaluate a
candidate such as `v0.2.0-readonly-context-rc`, but it does not create or push a
tag, publish a release, deploy, cut over, or claim readiness.
Write proof requires explicit `--enable-write`; accepted evidence must include
`accepted=true`, `native memory performed`, `governanceEvidenceMatrix`,
`localMemoryAuxiliaryEvidence`, and `writeRollbackEvidence`. Evidence can be
rechecked with `validateGovernedVcpNativeAcceptanceEvidenceArtifact`.

低披露要求：不写 endpoint、token、raw request/response、raw memory、raw audit 或 output path；不会返回 rollback plan reference 或 raw rollback plan。

Stop the managed bridge:

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:stop
```

## Codex MCP Config

The current Codex client target is:

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7625/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
bearer_token_env_var = "CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN"
enabled_tools = ["search_memory", "memory_overview", "audit_memory", "prepare_memory_context", "propose_memory_delta"]
default_tools_approval_mode = "prompt"

[mcp_servers.vcp_codex_memory.tools.search_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.memory_overview]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.audit_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.prepare_memory_context]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.propose_memory_delta]
approval_mode = "approve"
```

`CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN` should be loaded from the managed runtime
token file. Do not print or commit token material.

## Governance Model

The bridge governs these dimensions:

- `client_id`
- scope and visibility
- runtime target
- invocation profile
- read/write authority
- output disclosure budget
- audit receipt
- rollback posture

Local `codex-memory` storage is auxiliary only:

- fallback
- audit
- validation fixture
- compatibility
- offline continuity

## Boundaries

- VCPToolBox remains the native memory behavior owner.
- This repo should not modify VCPToolBox native source code.
- Runtime endpoints, tokens, raw memory, raw audit, and raw provider responses
  must not be disclosed through MCP results.
- Fixture provider proof is not production-provider proof.
- Read proof is not write proof.
- Default `tools/list` is read-only plus proposal-only; core handlers for
  commit/write/controlled mutation are not the default server contract.
- Dogfood on `7625` is not yet formal replacement of legacy `7605`.

## Development

Install dependencies:

```bash
npm install
```

Run the default test suite:

```bash
npm test
```

Run the focused governed native bridge tests:

```bash
node --test tests/security-profile-config.test.js tests/governed-mcp-vcp-native-bridge-app-integration.test.js
```

## Documentation

- Diary scope enforcement: [docs/DIARY_SCOPE_ENFORCEMENT_V1.md](docs/DIARY_SCOPE_ENFORCEMENT_V1.md)
- Runtime ledger: [docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md](docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md)
- WSL-local NewAPI proof runbook: [docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md](docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md)
- Historical client integration runbook: [docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md](docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md)
