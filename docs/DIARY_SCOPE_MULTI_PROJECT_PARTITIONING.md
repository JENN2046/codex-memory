# Diary scope multi-project partitioning gate

This contract prevents future governed writes from mixing unrelated projects
inside one client-only private diary. It is a local source/schema/test boundary;
it does not create a real partition, alter the private mapping, enable a public
write tool, call a provider, or authorize a native write.

## Stable identities and directory names

Every governed project must first appear in a private startup-only project
registry using stable lowercase slugs:

```json
{
  "schemaVersion": 1,
  "registryReference": "jenn-project-partition-registry-v1",
  "defaultPolicy": "deny",
  "projects": [
    {
      "projectId": "example-project",
      "workspaceId": "agents-os",
      "clients": ["Codex", "Claude"]
    }
  ]
}
```

The canonical future partition names are deterministic:

```text
Jenn-<Client>-Project-<projectId>-Private
Jenn-Project-<projectId>-Shared
Jenn-Workspace-<workspaceId>-Shared
```

`projectId` and `workspaceId` are stable identifiers, not display names. They
use lowercase ASCII letters, digits, and single hyphen separators. `projectId`
is globally unique across registered workspaces so canonical partition names
cannot collide. Renaming a repository display title must not silently rename
its identity or partition.

VCP DailyNote files remain timestamp/topic Markdown files inside the selected
partition. File names aid readability and uniqueness; they never grant access.
The mapping ownership and top-level diary allowlist remain the ACL boundary.

## Write activation gate

Before any future write activation, every registered project must have:

- exactly one project-specific `client_private` partition for every enabled
  client, bound to the exact `clientId + projectId + workspaceId`;
- exactly one `project_shared` partition bound to the exact project/workspace;
- exactly one `workspace_shared` partition for the workspace;
- both `exact_visibility` and `task_start_context` read profiles;
- `writeEligible=true` only for those governed targets;
- a valid diary-scope mapping with unique partition references, Unicode-safe
  names, and no ownership conflict.

The gate returns only counts and missing categories. It does not return raw
partition names. Any extra write-eligible client-only, unregistered-project, or
ownership-drifted entry rejects the complete activation allowlist. Missing,
extra, or conflicting prerequisites result in:

```yaml
write_activation_allowed: false
default_policy: deny
fallback_to_client_only_private: forbidden_for_project_writes
automatic_real_partition_creation: false
```

`resolveWrite()` also enforces the boundary at request time. When trusted scope
contains `projectId`, a private write must resolve to a `client_private` entry
with that exact project ID; it cannot fall back to the client-only private
partition. Read behavior remains unchanged and may still use the client-only
partition as general task-start context.

## Current state

The Stage 3B four-partition mapping proves one project read boundary, but it
does not contain project-specific private partitions. Therefore the new
multi-project provisioning gate intentionally remains blocked for write
activation. A later separately authorized activation must stage the private
registry and mapping, create the missing clean partitions, validate exact
binding, and run cross-project negative live proof before enabling writes.

```yaml
real_partitions_created_by_this_change: 0
real_mapping_modified: false
public_native_write_surface_enabled: false
native_memory_write_performed: false
production_ready_claimed: false
release_ready_claimed: false
cutover_ready_claimed: false
```
