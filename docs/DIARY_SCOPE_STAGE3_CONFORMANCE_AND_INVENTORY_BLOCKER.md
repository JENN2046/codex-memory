# Diary scope Stage 3 conformance and inventory blocker

This low-disclosure record covers the authorized Stage 3 attempt against
`codex-memory` main `0bb59e0469507769c2ee3ae05b25bb4285548de4`. It is not a
production, release, cutover, or readiness claim.

## Exact VCP source and synthetic conformance

The frozen VCP source identity was verified with replacement objects disabled
and with no replace refs, grafts, alternates, external object directory, or
untrusted common directory. The exact checkout loaded the frozen
`KnowledgeBaseManager.js` implementation and used a unique temporary root,
store, and synthetic vector set.

```yaml
source_commit: 555b3b538f6eb736e530c2912de678c5941f9985
source_tree: fd82d403e79f36f749eb7f555b4736eae3eacdff
knowledge_base_manager_blob: 9b28fff0f32ad709c79a7d6f0d31cae0dda485c9
source_identity_bound: true
exact_source_loaded: true
single_diary_search: pass
multi_diary_search: pass
unauthorized_index_loaded: false
global_search_calls: 0
provider_calls: 0
existing_config_read: false
existing_store_read: false
existing_log_read: false
public_service_started: false
vcp_core_changed: false
synthetic_vcp_conformance: pass
```

The conformance run exposed and repaired a codex-memory harness mismatch: the
real single-diary VCP result shape proves its source through the normalized
relative `fullPath` first segment, while multi-diary results use `diaryName`.
The harness now applies the same post-check contract as the governed runtime.

## Read-only inventory gate

The inventory enumerated only top-level diary partitions and structural entry
types. It did not open diary files, export memory, inspect raw logs, or read a
provider response.

```yaml
top_level_partition_count: 13
symlink_partition_count: 0
provable_codex_private_partition_count: 0
provable_claude_private_partition_count: 0
provable_project_shared_partition_count: 0
provable_workspace_shared_partition_count: 0
ambiguous_or_excluded_partition_count: 13
raw_diary_names_returned: false
raw_memory_read: false
```

One partition name is Codex-linked and prior source contains a matching native
write subdirectory convention, but that is not sufficient ownership evidence
for a client-private ACL mapping. No partition has evidence sufficient to bind
Claude-private ownership, and no legacy partition has evidence sufficient to
bind the required project/workspace shared ownership. Reclassification by
guess is forbidden, so every entry remains excluded from the allowlist.

## Stop decision

Stage 3 stopped at the authorized inventory hard stop. No real mapping was
generated, no mapping digest was bound, no runtime configuration was changed,
no service was started or stopped, and no provider-bound or real-memory recall
was attempted.

```yaml
mapping_generated: false
mapping_binding: not_run
service_health: not_run
mainline_strict: not_run
provider_bound_live_proof: not_run
native_memory_write: false
memory_migration: false
production_ready_claimed: false
release_ready_claimed: false
cutover_ready_claimed: false
final_verdict: BLOCKED_INVENTORY
```

The smallest safe continuation is to establish explicit, non-content
ownership metadata for at least one Codex-private partition, one Claude-private
partition, and the project/workspace shared partitions required by the live
matrix. Creating or populating those partitions would be a real memory write or
migration and was not performed by this attempt.
