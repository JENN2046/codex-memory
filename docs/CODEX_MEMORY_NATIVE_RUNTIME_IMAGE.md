# Codex Memory Native Runtime Image Authority

This document defines the Gate 5T digest-pinned native runtime candidate. It
does not authorize installation, profile mutation, production state mounts, or
runtime activation.

## Trust boundary

The application trust root is one accepted OCI archive hash and manifest, its image
configuration, ordered RootFS diff IDs, embedded build manifest, and exact
pre-created container configuration. Node, codex-memory, the clean VCP runtime,
Vexus, the dynamic loader, and userspace native libraries execute from that
image. A mutable Git checkout is provenance and build input only; it is never a
runtime execution root.

The host trust base is the Ubuntu kernel, root-owned systemd system manager,
root-owned installed launcher and authority record, Docker/containerd, the
root-owned Docker content store, and the trusted host administrator. Malicious
root, a compromised kernel/container runtime, and a Docker-capable same-user
process are outside the application threat model. The application container is
never given the Docker socket.

## Exact build input

`generate-codex-memory-runtime-context.js` requires two clean, exact-HEAD Git
worktrees. It materializes allowlisted paths using `git archive`, rejects
symlinks and special files, verifies the governed Vexus SHA-256, and publishes
the context only after a second content inventory. The manifest binds both
commits and trees, both lockfiles, the Vexus binary, the platform-specific base
manifest, every context file, build tool versions, and `SOURCE_DATE_EPOCH`.

The base is the linux/amd64 manifest
`sha256:8607a9064d4a571140998ae9e52a3b3fcf9cff361d04642d5971e6cd76d39e27`
from index
`sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3`.
Neither a mutable tag nor runtime package installation is accepted authority.

## Host and container responsibilities

The root-owned host launcher verifies the exact local image ID, RootFS chain,
build-manifest label, runtime container ID/configuration, and retained Edge
container identity. Its installed trust bundle lives under
`/usr/local/lib/codex-memory-native-runtime`, preserves the repository-relative
launcher/module layout, and is bound as a whole by the authority record. The
launcher checks that bundle digest before consulting Docker. The system Node
interpreter is an explicit host-trust-base component. The launcher starts Edge,
waits for bounded health, atomically emits a root-owned Edge receipt, re-verifies
all identities, and starts the exact pre-created runtime container. Stop retains
both containers and never stops the external Provider.

The authority record and Edge receipt contain no secrets. Their installed files
are root-owned, non-writable by group/other, and readable by the non-root runtime
only through individual read-only bind mounts. Secret material uses separate
owner-only mounts and is never placed in either receipt.

Authority creation re-verifies the digest-addressed OCI archive and requires
the imported local Docker image ID to equal its OCI manifest or config digest
(Docker's containerd image store reports the manifest digest as `.Id` on the
current Native host). It also requires the local ordered RootFS diff IDs to
match the archive. The mutable tag is never consulted after import.

The image-contained `container-supervisor` consumes the read-only authority
record, embedded build manifest, schema-v7 profile, and fresh Edge receipt. It
does not inspect host Git, call Docker, or fall back to repository paths. It
owns only image-contained VCP/HTTP/governance/relay children.

## State and credentials

Primary r5c state remains an external read-only bind mount with an exact mount
contract. Derived runtime data uses a dedicated bounded writable mount and
tmpfs. The image contains no memory, diary, vector, Provider state, or secret.
Future credentials are read-only external mounts and process-local values; they
are never build arguments, labels, or authority-record fields.

## Schema v7 and transition

Schema v6 remains readable. Schema v7 makes the digest-pinned image and exact
container the execution authority and classifies Edge lifecycle ownership as
`host_launcher`. `profileV7MigrationCandidate` produces an in-memory candidate
only, preserves primary state and credential references, and performs no
durable write. There is no automatic v6-to-v7 acceptance.

## R1 disposition

- Reuse: Git/npm dependency discovery, contract evidence, source/Vexus
  digesting, dirty exclusion, native ABI and RPATH checks.
- Adapt: contract digest to the embedded build manifest; lease substitution,
  concurrency, and stale-authority scenarios to OCI/container identity tests;
  lease reporting to image/config/RootFS/container evidence.
- Drop: byte-lease publication and GC, in-memory bootstrap, custom module
  loaders, anonymous addon loading, lease-root execution, and every mutable
  checkout fallback.

The separate uncommitted R1 worktree is evidence only and is not imported by
this implementation.
