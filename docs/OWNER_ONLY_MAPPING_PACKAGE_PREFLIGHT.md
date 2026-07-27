# Owner-Only Mapping Package Preflight

Status: source-only local operator utility; no private runtime verification or
readiness claim.

This utility prepares and verifies one non-overwriting diary-scope mapping
package inside an existing complete owner-only runtime root. It replaces the
abandoned local prototype that created a new, incomplete R4 private root.

It does not start Governance, Relay, Edge, or the native shim. It does not call
a provider or MCP tool, read memory, enable memory write, modify VCPToolBox, or
create a complete runtime configuration.

## Commands

Read-only planning, including a no-replace primitive probe:

```bash
npm run owner-runtime:mapping-package -- plan \
  --mapping-source /absolute/approved-owner-only/mapping.json \
  --private-root /absolute/existing-complete-owner-only-root \
  --package-name readonly-context-v2 \
  --json
```

Explicit private-configuration write:

```bash
npm run owner-runtime:mapping-package -- apply \
  --mapping-source /absolute/approved-owner-only/mapping.json \
  --private-root /absolute/existing-complete-owner-only-root \
  --package-name readonly-context-v2 \
  --confirm-private-config-write \
  --json
```

Read-only verification:

```bash
npm run owner-runtime:mapping-package -- check \
  --private-root /absolute/existing-complete-owner-only-root \
  --package-name readonly-context-v2 \
  --json
```

`--confirm-private-config-write` makes the filesystem side effect explicit. It
does not grant an agent authorization, bypass Jenn, or weaken the applicable P3
private-runtime-configuration boundary.

## Input Boundary

- Linux/WSL descriptor semantics are required.
- `apply` requires `/usr/bin/python3` and a libc exposing Linux `renameat2`;
  missing no-replace support fails closed.
- The mapping source must be a regular owner-owned file beneath an owner-only
  canonical directory.
- The existing complete private root must be a canonical owner-only directory.
- Symlinked sources, roots, package files, repository paths (including other
  Git worktrees), and `state-private/` paths fail closed.
- Mapping input is limited to 256 KiB and must satisfy the existing
  `DiaryScopeMapping` contract.
- Every entry must retain `writeEligible: false`.
- Package names are simple write-once child names under this utility contract;
  existing targets are never overwritten.

## Package Shape

The committed package contains exactly:

```text
<existing-complete-private-root>/<package-name>/
├── diary-scope-mapping.json
├── mapping-binding.json
└── mapping-binding.env
```

The directory is mode `0700`; files are mode `0600`.

The helper does not set a Linux immutable attribute. The owner can still alter
or remove files outside this utility; `check` fails closed when the package
shape, content, permissions, or descriptor/path identity has drifted.

The environment file contains only these mapping bindings:

```text
CODEX_MEMORY_DIARY_SCOPE_MAPPING_PATH
CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_REFERENCE
CODEX_MEMORY_EXPECTED_DIARY_SCOPE_MAPPING_DIGEST
CODEX_MEMORY_R4_DIARY_SCOPE_MAPPING_REFERENCE
CODEX_MEMORY_R4_EXPECTED_MAPPING_REFERENCE
CODEX_MEMORY_R4_EXPECTED_MAPPING_DIGEST
```

It deliberately does not export `CODEX_MEMORY_R4_GOVERNANCE_PRIVATE_ROOT`.
Registry, signing-key, native-token, issuer, endpoint, UDS, rollback, and other
runtime bindings remain owned by the separately governed complete runtime
configuration.

## Filesystem And Receipt Semantics

- Source, root, package, and package files are opened with `O_NOFOLLOW`;
  expected regular files also use `O_NONBLOCK` before type validation so FIFO
  or device replacement fails closed instead of hanging.
- Source and root directories are pinned by descriptors and checked with
  `fstat` identity.
- Writes use an exclusive owner-only staging directory and exclusive files.
- Each file is read back and `fsync`ed before the staging directory is synced.
- Commit uses a bundled isolated helper around
  `renameat2(RENAME_NOREPLACE)`, then parent-directory `fsync`. A target
  created during the final race window is preserved rather than overwritten.
- Pre-commit failures clean only the known staging files.
- A deterministic per-package staging name makes crash re-entry fail closed
  with `reconciliation_required` instead of creating another partial package.
- A post-rename identity or durability ambiguity is retained for reconciliation
  instead of being silently deleted.
- Receipts distinguish configuration write, cleanup, durable commit, and
  reconciliation without returning paths, diary names, mapping references,
  mapping digests, credentials, or raw content.

## Desktop Launchers

Linux/WSL:

```bash
scripts/launch-owner-runtime-mapping-package.sh
```

Windows:

```text
scripts\launch-owner-runtime-mapping-package-windows.bat
```

The Windows launcher resolves the repository relative to its own location. It
uses the default WSL distribution unless `CODEX_MEMORY_WSL_DISTRO` is already
set by the operator.

## Non-Claims

```yaml
private_runtime_verified: false
provider_called: false
memory_read: false
memory_write_enabled: false
public_mcp_expanded: false
production_ready: false
release_ready: false
deploy_ready: false
cutover_ready: false
readiness_claimed: false
```
