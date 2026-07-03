# VCP Memory Client Scope Visibility Matrix

Task id: `M5-K2-CLIENT-SCOPE-VISIBILITY-MATRIX`
Implementation slice: `CM-1721`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_GOVERNANCE_POLICY_SHIELD_TRUTH_TABLE.md`
Evidence type: `docs-only`, `client/scope/visibility matrix`, `no-runtime`

## Purpose

This matrix defines client identity, project/workspace scope, and visibility
rules for future governed VCPToolBox-native memory calls by Codex and Claude.

It does not call VCPToolBox, read client-private memory, inspect raw runtime
state, execute fallback, write durable memory, call providers/APIs, expand
public MCP tools, issue an approval line, or claim readiness.

## Client Identity Model

| Client class | Safe client id family | Private boundary | Default sharing posture |
|---|---|---|---|
| Codex | `codex:<safe_workspace_or_agent_alias>` | Codex-private memory cannot be disclosed to Claude-private requests | private unless shared boundary is explicit |
| Claude | `claude:<safe_workspace_or_agent_alias>` | Claude-private memory cannot be disclosed to Codex-private requests | private unless shared boundary is explicit |
| Shared operator | `shared:<safe_project_alias>` | Shared memory must name a project/workspace boundary | shared only when explicitly declared |
| Unknown | absent or unrecognized | no access to private or shared memory | fail closed |

`client_id` values in receipts and docs must be safe aliases or presence flags.
They must not contain raw account ids, tokens, session cookies, endpoints,
private profile paths, or raw chat identifiers.

## Scope Fields

Every future request must declare these fields before policy evaluation:

```yaml
scope_boundary:
  client_id_present: <true|false>
  client_family: <codex|claude|shared|unknown>
  workspace_scope_present: <true|false>
  project_scope_present: <true|false>
  owner_scope_present: <true|false>
  task_scope_present: <true|false>
  visibility: <private|shared|public|unknown>
  scope_expansion_requested: <true|false>
  cross_client_access_requested: <true|false>
```

Missing `client_id`, workspace/project, owner, or visibility prevents
success-like results.

## Visibility Matrix

| Request client | Requested visibility | Source visibility | Decision | Required receipt marker |
|---|---|---|---|---|
| Codex | `private` | Codex private same workspace/project | allow inside exact boundary | `client_family=codex`, `visibility=private`, `cross_client_access_requested=false` |
| Codex | `private` | Claude private | `stop_l4` | `stop_condition=ERR_CROSS_CLIENT_PRIVATE_LEAKAGE` |
| Claude | `private` | Claude private same workspace/project | allow inside exact boundary | `client_family=claude`, `visibility=private`, `cross_client_access_requested=false` |
| Claude | `private` | Codex private | `stop_l4` | `stop_condition=ERR_CROSS_CLIENT_PRIVATE_LEAKAGE` |
| Codex or Claude | `shared` | Shared same project/workspace | allow only if shared boundary is explicit | `visibility=shared`, `shared_boundary_present=true` |
| Codex or Claude | `shared` | Shared unknown project/workspace | deny | `stop_condition=ERR_SCOPE_MISSING` |
| Any known client | `public` | Public/sanitized project memory | allow only inside approved profile and output budget | `visibility=public`, `raw_private_payload_requested=false` |
| Unknown | any | any private/shared/public memory | deny | `stop_condition=ERR_UNKNOWN_CLIENT_ID` |

## Scope Expansion Matrix

| Expansion request | Decision | Reason |
|---|---|---|
| Same client, same workspace, same project, narrower task scope | allow inside exact boundary | scope narrows |
| Same client, same workspace, same project, broader task scope | `needs_exact_boundary` | scope expands |
| Same client, different project or workspace | `needs_exact_boundary` or deny | project/workspace changes |
| Cross-client private access | `stop_l4` | private leakage risk |
| Private to shared disclosure | `needs_exact_boundary` | visibility expands |
| Shared to private copy | `needs_exact_boundary` | ownership and lifecycle change |
| Unknown client or unknown visibility | deny | cannot evaluate |
| Raw private payload requested as part of expansion | `stop_l4` | raw private output boundary |

## Safe Routing Rules

- Codex-private results must not appear in Claude-private output.
- Claude-private results must not appear in Codex-private output.
- Shared output requires explicit shared boundary, project/workspace scope, and
  low-disclosure output policy.
- Unknown client identity fails closed before target/runtime inspection.
- Scope expansion cannot be treated as a routine L0-L3 self-approval.
- Fallback does not weaken client/scope/visibility checks.
- Receipts must include safe presence markers, not raw private identifiers.

## Fixture Decisions

These are static decisions only.

| ID | Input | Expected decision |
|---|---|---|
| `M5-CSVM-001` | Codex private request to Codex private same workspace/project | allow inside exact approved profile |
| `M5-CSVM-002` | Codex private request to Claude private memory | `stop_l4` |
| `M5-CSVM-003` | Claude private request to Codex private memory | `stop_l4` |
| `M5-CSVM-004` | Codex request to shared memory with explicit shared boundary | allow inside exact approved profile |
| `M5-CSVM-005` | Shared visibility requested but project/workspace missing | deny |
| `M5-CSVM-006` | Unknown client id | deny |
| `M5-CSVM-007` | Same-client broader project/workspace request | `needs_exact_boundary` |
| `M5-CSVM-008` | Raw private output requested during visibility expansion | `stop_l4` |

## M5-K2 Conclusion

M5-K2 makes client identity, scope, and visibility explicit enough for future
policy tests. It preserves the rule that Codex and Claude private memory do not
cross-leak, shared visibility requires an explicit boundary, and unknown
client identity fails closed.

Next safe route: M6 observe-lite exact approval packet preparation. Do not
execute live runtime without a separate exact approval boundary.
