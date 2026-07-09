# codex-memory

[中文说明](README.zh-CN.md)

`codex-memory` is the governed MCP bridge that lets Codex access VCPToolBox
native memory without making `codex-memory` the memory-intelligence owner.

The product goal is governance: who may access memory, which scope and runtime
they may use, how much output can be disclosed, what evidence is recorded, and
how rollback stays bounded.

当前目标是让 Codex 通过 `codex-memory` 治理桥，完整、受控、可审计地
使用 VCPToolBox native memory runtime。

## Current Status

Current active path:

```text
Codex
  -> vcp_codex_memory MCP on 127.0.0.1:7625
  -> codex-memory governed bridge
  -> VCP native shim on 127.0.0.1:7615
  -> VCPToolBox native memory
  -> WSL-local NewAPI provider on 127.0.0.1:3000
```

The live read path has passed production-provider proof through WSL-local
NewAPI. Real Codex client dogfood has called:

- `search_memory`
- `memory_overview`
- `audit_memory`

Those tools are currently exposed as read-only. The legacy `7605` service is
kept as rollback while `7625` is observed in real use.

Write tools are not part of the current Codex client surface. Native writes
require exact operator approval, bounded rollback posture, and a separate
real-root write proof.

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
npm run vcp-native:shim -- --vcp-root /path/to/VCPToolBox --kb-store /tmp/codex-memory-vcp-derived-store
npm run vcp-native:acceptance -- --endpoint http://127.0.0.1:7615/mcp/vcp-native --target-ref operator-vcp-toolbox-service-ref --include-read-suite --verify-evidence /tmp/codex-memory-vcp-native-evidence.json
```

Read acceptance covers `search_memory` / `memory_overview` / `audit_memory`.
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
enabled_tools = ["search_memory", "memory_overview", "audit_memory"]
default_tools_approval_mode = "prompt"

[mcp_servers.vcp_codex_memory.tools.search_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.memory_overview]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.audit_memory]
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

- Runtime ledger: [docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md](docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md)
- WSL-local NewAPI proof runbook: [docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md](docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md)
- Historical client integration runbook: [docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md](docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md)
