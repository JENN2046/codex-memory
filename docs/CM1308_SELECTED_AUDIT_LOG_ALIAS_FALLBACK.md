# CM-1308 Selected Audit Log Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1308 fixes selected audit correlation projection normalization in `AuditLogStore`.

The selected mutation audit projection now treats blank paired fields as absent before falling through across camel/snake aliases for:

- `event_id` / `eventId`
- `correlation_id` / `correlationId`
- `memory_id` / `memoryId`
- `audit_phase` / `auditPhase`
- `event_type` / `eventType`
- `tool_name` / `toolName`
- `actor_client_id` / `actorClientId`
- `request_source` / `requestSource`

The selected write manifest audit projection now applies the same first non-empty normalization for top-level memory/request fields and manifest store/idempotency/hash fields.

## Result

- Selected write-audit correlation no longer misses a pending/committed pair solely because a blank alias appears before the effective paired field.
- Selected write-manifest audit correlation no longer misses manifest evidence because blank camel-case fields mask snake_case fields.
- Projection remains selected-fields-only and does not return raw audit payloads.

## Validation

- `node --check src\storage\AuditLogStore.js`
- `node --check tests\audit-log-store-selected-correlation.test.js`
- `node --test tests\audit-log-store-selected-correlation.test.js tests\selected-audit-correlation-observation-preflight.test.js tests\selected-audit-correlation-current-facts-preflight-cli.test.js tests\durable-write-kernel-idempotency-runtime.test.js` passed `30/30`.
- `npm test` passed `2834/2834`.

## Boundaries

This change did not execute live write/recall, read real memory/store/jsonl, call providers or external MCP tools, write durable audit outside temp-local test fixtures, expand public MCP tools, change config/watchdog/startup, push, deploy, or claim readiness/reliability.

