# VCP Memory Observe-Lite CM1791 Source-Only Memory Capability Endpoint Map

Task id: `M6-OBSERVE-LITE-SOURCE-ONLY-MEMORY-CAPABILITY-ENDPOINT-MAP`
Implementation slice: `CM-1791`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1790_STATUS_ONLY_ROUTE_MATRIX_RECEIPT.md`
Evidence type: `source-only`, `manifest-map`, `no-runtime`,
`no-log`, `no-secret`, `no-response-body`, `no-memory-result`,
`no-approval-line`

## Boundary

CM-1791 maps VCPToolBox memory and capability surfaces from source files and
plugin manifests only. It does not start the VCPToolBox runtime, call an HTTP
route, read response bodies, read stdout/stderr, read runtime logs, read
`config.env` contents, read `.env` contents, read secrets, read raw memory,
read raw stores, read raw runtime responses, or read provider responses.

It does not call MCP memory tools, execute a VCPToolBox plugin, run a real
memory query, read memory results, write memory, change config, change
startup/watchdog settings, expand public MCP tools, release, deploy, cut over,
push, or claim readiness.

## Source Surfaces Reviewed

The review used source code and plugin manifests under the local disposable
VCPToolBox checkout. It did not inspect runtime data directories, memory store
contents, logs, `config.env`, `.env`, provider responses, or response bodies.

| Surface family | Reviewed source role | Execution status |
|---|---|---|
| `server.js` | route and manager wiring, plugin manager injection, AI response diary path | `SOURCE_ONLY` |
| `routes/protocolBridge.js` | compatibility bridge into the chat processing chain | `SOURCE_ONLY` |
| `routes/admin/rag.js` | admin RAG, TagMemo, and knowledge-base management routes | `SOURCE_ONLY` |
| `routes/dailyNotesRoutes.js` | admin daily-note route family | `SOURCE_ONLY` |
| `modules/dynamicToolRegistry.js` | tool registry categories and memory-knowledge classification | `SOURCE_ONLY` |
| `modules/chatCompletionHandler.js` | VCP tool and RAG refresh flow | `SOURCE_ONLY` |
| `modules/messageProcessor.js` | message preprocessing and RAG integration path | `SOURCE_ONLY` |
| `modules/semanticModelRouter.js` | semantic routing and RAG context use | `SOURCE_ONLY` |
| `modules/associativeDiscovery.js` | associative discovery over semantic/tag surfaces | `SOURCE_ONLY` |
| `Plugin/*/plugin-manifest.json` | memory-related plugin command inventory | `SOURCE_ONLY` |

## Capability Map

| Candidate surface | Source-level role | Memory risk if called | CM-1791 result |
|---|---|---|---|
| `/v1/chat/completions` | Main chat processing chain with VCP tool and RAG integration | May trigger provider calls, tool execution, RAG, or memory-side effects depending on request and config | `MAPPED_NOT_CALLED` |
| `/v1/chatvcp/completions` | VCP info / VCP processing variant of chat completion | Same provider/tool/RAG risks as chat chain | `MAPPED_NOT_CALLED` |
| Protocol bridge routes | Compatibility bridge into the chat processing chain | May route into provider/tool/RAG execution | `MAPPED_NOT_CALLED` |
| `/v1/human/tool` | Direct tool invocation route | May execute memory read/write plugins if a memory tool is selected | `MAPPED_NOT_CALLED` |
| Admin RAG routes | RAG, TagMemo, knowledge-base, and management operations | May read/write memory, indexes, or configuration-adjacent state | `MAPPED_NOT_CALLED` |
| Admin daily-note routes | Daily-note management/search route family | May read/write daily-note memory surfaces | `MAPPED_NOT_CALLED` |
| `LightMemo` | `SearchRAG` and `MapDistance` memory/knowledge recall surface | Real memory read and possible vector/tag/rerank/provider-adjacent paths | `MAPPED_NOT_CALLED` |
| `DailyNoteSearcher` | `SearchDailyNote` retrieval surface | Real daily-note or knowledge search result read if called | `MAPPED_NOT_CALLED` |
| `DailyNote` | `create` / `update` write-capable daily-note surface | Durable memory write/update if called | `MAPPED_NOT_CALLED` |
| `DailyNoteWrite` path | AI-response diary write path through plugin manager | Durable memory write if triggered | `MAPPED_NOT_CALLED` |
| `DailyNoteManager` | `list`, `organize`, and `associate` management surface | May list, organize, or associate memory content | `MAPPED_NOT_CALLED` |
| `RAGDiaryPlugin` | RAG, TagMemo, DeepMemo/AIMemo-style context bridge surface | May read memory, use embedding/cache paths, or refresh RAG context | `MAPPED_NOT_CALLED` |
| `ContextFoldingV2` | Context folding / preprocessing support over RAG context | May call context bridge and compact recalled context | `MAPPED_NOT_CALLED` |
| `ThoughtClusterManager` | Cluster file list/create/edit surface | Durable file operations if create/edit is called | `MAPPED_NOT_CALLED` |
| `KnowledgeBaseManager` | Knowledge-base manager injected into plugin manager | Data/index layer; direct store contents not inspected | `MAPPED_NOT_CALLED` |
| `TDBKnowledgeManager` | TDB knowledge manager injected into plugin manager | Data/index layer; direct store contents not inspected | `MAPPED_NOT_CALLED` |

## Endpoint Selection Consequence

CM-1791 narrows the next live-proof question: a useful M6 memory/capability
handshake cannot be proven by `/health`, because CM-1790 found no source route.
The evidence also shows that meaningful memory capability proof would likely
need a bounded direct tool invocation or chat-chain request.

That next step is not automatically safe just because the runtime is local and
disposable. A real `LightMemo`, `DailyNoteSearcher`, `RAGDiaryPlugin`, or
`DailyNote` invocation can cross from route proof into memory read, memory
write, provider-adjacent, or response-body proof territory. The next safe
route is therefore a separate exact invocation-envelope preflight that defines
one selected tool surface, one non-secret query shape, body disclosure limits,
and stop conditions before any response body or memory result is inspected.

## Evidence

```yaml
cm1791_source_only_memory_capability_endpoint_map:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_only: true
  runtime_started: false
  service_start_attempted: false
  route_called: false
  response_body_read: false
  stdout_read: false
  stderr_read: false
  runtime_logs_read: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
  raw_memory_read: false
  raw_store_read: false
  raw_runtime_response_read: false
  provider_api_called: false
  mcp_memory_tool_called: false
  vcp_plugin_executed: false
  memory_read_performed: false
  memory_write_performed: false
  memory_result_returned: false
  public_mcp_expansion_performed: false
  config_startup_watchdog_changed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  m6_memory_capability_endpoint_map_complete: true
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1792_exact_invocation_envelope_preflight_for_one_memory_capability_surface
```

## Interpretation

CM-1791 completes only the source-only memory capability endpoint map. It
identifies the surfaces that can eventually prove VCP memory capability and
separates them from status-only route proof.

It does not prove live memory capability, does not execute a memory tool, does
not read a memory result, does not open M7/M8/M15, and does not claim release,
deploy, cutover, `RC_READY`, complete V8, or full bridge completion.
