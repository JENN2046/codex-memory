# P22.6 Release Candidate Artifact Manifest Shape

Phase: `P22.6-release-candidate-artifact-manifest-shape`

Status: `DRAFT_SHAPE_ONLY`

## Purpose

Define the future release-candidate artifact manifest shape for a named RC artifact.

This document is a planning draft only. It does not create an artifact, run tests, run gates, create fixtures, create a tag, create a release, deploy, mutate configuration, call providers, run migration, or apply import/export.

## Boundary

The future manifest records evidence and approval state for a release-candidate artifact. It must not itself be treated as approval to perform the artifact creation or any release action.

Required boundary defaults:

- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- provider calls are not included
- Codex / Claude configuration is not mutated
- SQLite migration is not run
- import/export is not applied
- tag, release, and deploy are not performed
- live runtime startup, startup task installation, watchdog installation, and HKCU Run edits remain out of scope unless separately approved

## JSON Shape

Future RC artifact manifests should use a stable JSON envelope:

```json
{
  "schema": "p22.release_candidate_artifact_manifest.v1",
  "rc_candidate_id": "<RC_CANDIDATE_ID>",
  "target_commit": "<TARGET_COMMIT_SHA>",
  "created_at": "<ISO_8601_TIMESTAMP>",
  "created_by": "<OPERATOR_OR_AGENT>",
  "source_branch": "<SOURCE_BRANCH>",
  "artifact": {
    "status": "NOT_CREATED",
    "type": "release-candidate-manifest",
    "path": "<ARTIFACT_PATH_OR_NULL>",
    "hash": "<ARTIFACT_HASH_OR_NULL>"
  },
  "gate_refresh_result": {
    "status": "PASS | FAIL | STALE | NOT_RUN",
    "evidence_commit": "<GATE_EVIDENCE_COMMIT_OR_NULL>",
    "executed_at": "<ISO_8601_TIMESTAMP_OR_NULL>",
    "execution_checkout": "<DETACHED_WORKTREE_OR_NULL>",
    "head_equals_target_commit": true,
    "summary": {
      "git_diff_check": "pass | fail | not_run",
      "docs_validation": "pass | fail | not_run",
      "npm_test": "pass | fail | not_run",
      "gate_ci": "pass | fail | not_run",
      "compare_standard_suite": "match | mismatch | not_run",
      "rollback_standard_suite": "ready | not_ready | not_run",
      "strict_mainline_gate": "pass | fail | not_run | not_required"
    }
  },
  "gate_evidence_summary": {
    "fresh_for_target_commit": false,
    "provider_calls": 0,
    "mutated": false,
    "test_count": "<PASSED_TOTAL_OR_NULL>",
    "compare_cases": "<MATCHED_TOTAL_OR_NULL>",
    "rollback_cases": "<READY_TOTAL_OR_NULL>",
    "redacted_log_refs": []
  },
  "mcp_contract": {
    "public_tools": [
      "record_memory",
      "search_memory",
      "memory_overview"
    ],
    "public_tool_expansion": false,
    "schema_change": false,
    "validate_memory": {
      "status": "INTERNAL_ONLY",
      "publicly_exposed": false
    }
  },
  "mutation_boundary": {
    "provider_calls": false,
    "codex_config_mutation": false,
    "claude_config_mutation": false,
    "startup_or_watchdog_mutation": false,
    "sqlite_migration": false,
    "import_export_apply": false,
    "real_memory_write": false,
    "tag_created": false,
    "release_created": false,
    "deployed": false
  },
  "known_gaps": [
    {
      "id": "<GAP_ID>",
      "description": "<REDACTED_GAP_SUMMARY>",
      "required_before_release": true
    }
  ],
  "rollback_story": {
    "tier": "tier-0-docs-only | tier-1-gate-failure | tier-2-runtime-config | tier-3-durable-data | tier-4-provider-live | tier-5-release-artifact",
    "protected_assets": [],
    "backup_required": false,
    "rollback_path": "<ROLLBACK_PATH_OR_NOT_APPLICABLE>",
    "post_rollback_validation": []
  },
  "support_handoff": {
    "operator": "<OPERATOR>",
    "reviewer": "<REVIEWER_OR_NULL>",
    "fresh_gates": [],
    "stale_gates": [],
    "skipped_gates": [],
    "approval_required_gates": [],
    "troubleshooting_entrypoint": "<DOC_OR_COMMAND_REFERENCE>",
    "escalation_path": "<ESCALATION_PATH>",
    "next_safe_action": "<NEXT_SAFE_ACTION>"
  },
  "approval_status": {
    "decision": "NOT_APPROVED | APPROVED_FOR_NAMED_OPERATION_ONLY | APPROVED_FOR_DRY_RUN_ONLY | REJECTED_NEEDS_MORE_EVIDENCE | REJECTED_SCOPE_TOO_BROAD | BLOCKED_HARD_STOP",
    "approved_by": "<APPROVER_OR_NULL>",
    "approved_at": "<ISO_8601_TIMESTAMP_OR_NULL>",
    "approval_sentence": "<EXPLICIT_APPROVAL_SENTENCE_OR_NULL>"
  }
}
```

## Field Requirements

| Field | Requirement |
|---|---|
| `rc_candidate_id` | Stable, human-readable candidate identifier. It must not imply tag, release, or deploy completion. |
| `target_commit` | Full commit SHA the future artifact represents. Gate evidence must state whether it is fresh for this commit. |
| `gate_refresh_result` | Latest approved gate refresh result, including stale or not-run status when applicable. |
| `gate_evidence_summary` | Redacted summary only. Do not include secrets, broad real memory content, provider keys, auth cookies, or raw private config. |
| `mcp_contract.public_tools` | Must remain exactly `record_memory`, `search_memory`, `memory_overview` unless a separate approved phase changes the public contract. |
| `mcp_contract.validate_memory` | Must record `INTERNAL_ONLY` and `publicly_exposed: false` for P22 RC planning. |
| `mutation_boundary` | Must explicitly show no provider call, no config mutation, no migration, no import/export apply, no tag, no release, and no deploy unless separately approved. |
| `known_gaps` | Must include unresolved evidence, stale gates, support gaps, blocked live checks, or approval gaps. Empty only when reviewed. |
| `rollback_story` | Must reference the rollback/support tier and the safe path back from the represented state. |
| `support_handoff` | Must let a future operator identify fresh gates, stale gates, skipped gates, approval-required gates, troubleshooting entrypoint, escalation path, and next safe action. |
| `approval_status` | Defaults to `NOT_APPROVED` or `BLOCKED_HARD_STOP`; ambiguous continuation language is not approval. |

## Markdown Companion Shape

If a human-readable Markdown companion is created for the same future RC artifact, use this section order:

```text
# <RC Candidate ID> Artifact Manifest

Target commit:
Artifact status:
Gate refresh result:
Gate evidence summary:
Public MCP tools:
validate_memory status:
Mutation boundary:
Known gaps:
Rollback story:
Support handoff:
Approval status:
```

The Markdown companion must mirror the JSON manifest and should not introduce extra authority, broader scope, or unredacted evidence.

## Default Approval State

Default decision: `BLOCKED_HARD_STOP`

A manifest with `NOT_APPROVED` or `BLOCKED_HARD_STOP` may document readiness evidence, but it does not authorize:

- artifact creation
- provider call
- Codex / Claude config mutation
- startup or watchdog mutation
- real memory write
- SQLite migration
- import/export apply
- MCP public tool or schema expansion
- tag
- release
- deploy

## P22.6 Result

Result: `P22_RC_ARTIFACT_MANIFEST_SHAPE_DRAFTED_NOT_CREATED`

This document is sufficient to describe the expected future manifest shape. It is not sufficient to create an RC artifact, run gates, create fixtures, tag, release, deploy, mutate config, call providers, or apply migration/import-export.
