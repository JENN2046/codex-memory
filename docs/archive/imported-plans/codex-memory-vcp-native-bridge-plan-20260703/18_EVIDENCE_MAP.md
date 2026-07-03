# Evidence Map

## Key judgments

| Judgment | Evidence level | Source summary |
|---|---|---|
| Latest inspected main commit is `93359a8cdc5781dfe591cbf842c28276f6528ea3` | verified from repository | GitHub main commit page inspected on 2026-07-03 |
| README currently positions project as independent/no VCPToolBox runtime | verified from repository | README repository page |
| `.agent_board/CURRENT_FACTS.json` is more current than STATUS/CURRENT_STATE/TASK_QUEUE | verified from repository snapshot | CURRENT_FACTS says CM-1713/CMV-1816; STATUS/CURRENT_STATE/TASK_QUEUE show CM-1700/CMV-1805 |
| Latest validation CMV-1816 is fixture/default-safe and no-live-VCP | verified from repository snapshot | VALIDATION_LOG latest entry and CURRENT_FACTS status |
| VCPToolBox vision doc aligns with bridge strategy but is vision/routing only | verified from repository + inferred from docs | VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN |
| VCP parity roadmap remains local parity oriented | verified from repository | VCP_MEMORY_PARITY_ROADMAP |
| Old uploaded review reflects pre-pivot parity path | verified from uploaded file | Uploaded `仓库代码审查.txt` |
| New strategy should become primary | assumed from user strategy | User instruction |
| Actual live VCPToolBox capability and result shape | unresolved | Requires exact-approved M6/M7 live proof |
| Local worktree ahead/behind/dirty in future Codex environment | unresolved | Requires fresh git commands in executor checkout |

## Evidence discipline by category

```yaml
verified_from_repository:
  - repo identity
  - latest inspected main commit via GitHub
  - README positioning
  - committed CURRENT_FACTS / VALIDATION_LOG / STATUS / CURRENT_STATE / TASK_QUEUE contents
  - package scripts and current validation surfaces
  - VCPToolBox vision document contents
  - VCP parity roadmap contents

inferred_from_docs:
  - README and old roadmap drift against new strategy
  - CURRENT_FACTS/VALIDATION_LOG are more current than STATUS/CURRENT_STATE/TASK_QUEUE
  - local parity route should be downgraded to fallback/reference

assumed_from_user_strategy:
  - VCP-native-first governed bridge is the desired north star
  - L0-L3 bounded autonomous approval and L4 strict hard stops are the desired authorization model
  - Codex/Claude use VCP memory only through governed MCP tools

unresolved:
  - local git worktree exact status
  - exact VCPToolBox runtime target/transport
  - live read result shape
  - first durable write safety until exact approval and proof
```
