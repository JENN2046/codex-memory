# CM-1688 VCPToolBox Full-Capability Runtime Bridge Discovery

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_FULL_CAPABILITY_RUNTIME_BRIDGE_DISCOVERY_DOCS_ONLY_TARGET_RUNTIME_NOT_FOUND`

## Purpose

CM-1688 corrects the VCPToolBox sustained-memory integration direction.

The target is not a reduced summary-only recall helper. The target is a
full-capability bridge that lets Codex use VCPToolBox as the realtime memory
brain during sustained conversations.

Target architecture:

```text
Codex sustained conversation
  -> codex-memory VCP full-capability bridge
    -> VCPToolBox memory runtime
      -> DailyNote / DailyNoteManager / KnowledgeBaseManager
      -> TagMemo / LightMemo / TDBKnowledge
      -> DeepMemo / TopicMemo / MeshMemo / RAGDiaryPlugin
```

This document records discovery and implementation direction only. It does not
wire runtime behavior, call VCPToolBox, read VCP memory stores, read
`config.env`, edit `.env`, edit VCP config/profile files, call providers, write
memory, expand public MCP tools, or claim production/release/cutover readiness.

## Decision

The future bridge should not intentionally restrict VCPToolBox memory
capability.

Bridge policy should be:

```text
Expose VCPToolBox capability by profile.
Do not silently downgrade VCPToolBox capability to summary-only mode.
Do not replace VCPToolBox memory with codex-memory memory.
Use codex-memory as the orchestrator, profile selector, audit layer, and Codex
workflow integration point.
```

CM-1684 and CM-1685 remain useful as conservative safety evidence, but they are
not the implementation ceiling. Their summary-only no-write envelope is now
classified as an optional `observe-lite` profile, not the full target.

## Local Runtime Discovery

Discovery performed:

```text
git status --short --branch
Test-Path A:\VCP\VCPToolBox
rg --files A:\VCP\VCPToolBox with env/key/db/jsonl exclusions when present
```

Observed result:

```text
A:\VCP\VCPToolBox not found
```

Therefore CM-1688 did not inspect a live VCPToolBox checkout, did not discover a
current local runtime entrypoint, and did not execute a live connector probe.

## Full-Capability Surface Map

The bridge target includes the VCP memory surfaces already identified in
project docs:

| VCP surface | Full-capability target |
|---|---|
| `DailyNote` | Hot conversation/day memory read and governed write where VCP supports it |
| `DailyNoteManager` | Native daily-note recall and management entrypoints |
| `KnowledgeBaseManager` | Native hot memory search, vector, rerank, and knowledge operations |
| `TagMemo` / `TagMemoEngine` | Native association, tag boost, semantic topology, and geodesic behavior |
| `LightMemo` | Native intent/directory recall route selection |
| `TDBKnowledge` | Native cold knowledge retrieval |
| `DeepMemo` | Native deep/semantic recall behavior |
| `TopicMemo` | Native topic list/get/recall behavior |
| `MeshMemo` | Native mesh/association recall where exposed |
| `RAGDiaryPlugin` | Native passive injection and orchestration behavior |

The bridge should preserve component identity in receipts so Codex can tell
whether a result came from VCP hot memory, cold knowledge, active recall, passive
injection, or a write path.

## Required Runtime Profiles

Future implementation should support these profiles instead of one fixed
low-disclosure mode:

| Profile | Capability | Intended use |
|---|---|---|
| `observe-lite` | Conservative summary/no-write projection | Compatibility with CM-1684/CM-1685 evidence |
| `observe-full` | Full VCP read capability, no writes | Runtime discovery, quality review, and call-shape validation |
| `trusted-full-read` | Full native VCP read capability with structured/raw output allowed by profile | Sustained conversation recall |
| `trusted-write-proposal` | Full read plus Codex-generated write proposals, no automatic durable write | Human-reviewed memory curation |
| `trusted-full` | Full native VCP read/write through an explicit trusted profile | Owner-controlled full-power integration |

The bridge must not collapse all profiles to `summaryOnly=true`. The projection
shape is a profile decision.

## Codex Workflow Integration Target

Full implementation means Codex can use VCPToolBox memory continuously at these
points:

- session startup and resume
- task selection
- before changing source, docs, tests, or governance state
- before commit/push decisions
- after validation failure
- during handoff/checkpoint generation
- when user asks for prior context, decisions, or preferences
- when Codex decides whether a new memory should be proposed or written

The bridge should support both pull-style recall and push-style write/proposal
flows. It should not be limited to one manual query helper.

## Required Connector Questions

Before source wiring, the next task must identify from a real VCPToolBox
checkout, runtime docs, or operator-provided target:

| Question | Required answer |
|---|---|
| Runtime target | Exact checkout path, service URL, MCP server, CLI, plugin API, or IPC surface |
| Startup state | Whether VCPToolBox runtime is already running or must be started externally |
| Transport | HTTP, stdio MCP, local CLI, websocket, file bridge, or plugin call |
| Auth/profile | Non-secret field names and profile selection mechanism |
| Read entrypoints | Exact entrypoints for each memory surface |
| Write entrypoints | Exact entrypoints for DailyNote/TagMemo/Knowledge writes where supported |
| Raw output mode | Which entrypoints can return raw, structured, summary, or injected context |
| Scope model | How VCP identifies user/project/workspace/client/session/agent |
| Failure model | Timeout, partial result, auth rejection, stale runtime, missing component |
| Receipts | What can be recorded without storing secrets or credentials |

## Implementation Shape

Future source implementation should land as a bridge layer, not a replacement
memory backend:

```text
src/core/VcpToolBoxFullCapabilityBridgeProfile.js
src/core/VcpToolBoxFullCapabilityRuntimeTarget.js
src/adapters/vcp-toolbox/*
tests/vcp-toolbox-full-capability-*.test.js
docs/CM1689_*
```

The first source slice should be a target/profile parser and call-plan builder
that can represent full VCP capability without executing it. The first runtime
slice should be an exact-target read probe against a real VCPToolBox runtime.

## Non-Claims

CM-1688 does not claim:

```text
VCPToolBox runtime found
VCPToolBox live connector implemented
Codex sustained conversation wired to VCPToolBox
full VCP read executed
full VCP write executed
VCP config/profile changed
production/release/cutover ready
complete V8 implemented
```

## Validation

CM-1688 validation is docs/status validation:

```text
fresh git status observed
docs/source consistency review
local VCPToolBox default-path discovery
git diff --check
docs validation
CURRENT_FACTS.json parse
changed-scope review
```

## Next Step

Recommended next task:

```text
CM-1689 VCPToolBox full-capability target/profile parser and call-plan contract
```

That task should implement a local source/test helper that models
`observe-full`, `trusted-full-read`, `trusted-write-proposal`, and
`trusted-full` without calling VCPToolBox yet. Runtime execution should follow
only after a real target path or service endpoint is identified.
