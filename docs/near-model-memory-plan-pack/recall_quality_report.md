# Recall Quality Report

Schema: `memory_context_recall_quality_gate_v1`
Generated: `2026-07-10T00:00:00.000Z`
Status: `PASS`

This is a fixture/local dry-run quality baseline for `prepare_memory_context`. It does not read real private memory, call VCPToolBox runtime, call providers, write memory, or prove production recall quality.

| Case | Status | Evidence |
|---|---:|---|
| project fact recall | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| historical decision recall | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| current blocker recall | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| user preference recall | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| stale fact filtering | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| conflict fact surfacing | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| private isolation | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| workspace isolation | `PASS` | search_result_count=1; fallback_used=false; native_confusion=false |
| fallback distinction | `PASS` | search_result_count=1; fallback_used=true; native_confusion=false |

## Boundary

- Fixture/local dry-run only.
- Read-only context package path only.
- No durable mutation, production write, provider/API call, MCP memory tool call, raw memory read, raw audit read, VCPToolBox runtime call, release/deploy/cutover, or readiness claim.
- VCPToolBox native memory remains the final memory intelligence owner; local context packaging remains fallback/audit/validation/compat/offline continuity.
