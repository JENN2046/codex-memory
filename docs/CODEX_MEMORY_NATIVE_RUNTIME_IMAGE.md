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
worktrees. It materializes allowlisted paths from exact Git objects, rejects
symlinks and special files, verifies the governed Vexus SHA-256, and publishes
a deterministic USTAR context artifact only after a second content inventory.
The builder opens that artifact once with `O_NOFOLLOW`, verifies its complete
inventory, and sends those same in-memory bytes to BuildKit over stdin. It
never asks BuildKit to re-read the manifested staging directory and has no
mutable-checkout fallback. Before publication it independently maps every
archived source byte back to the blob ID in each accepted Git tree. The build
command also requires the operator-carried SHA-256 of the whole context
artifact, so a later self-consistent replacement artifact cannot self-authorize.
The manifest binds both
commits and trees, both lockfiles, the Vexus binary, the platform-specific base
manifest, every context file, build tool versions, and `SOURCE_DATE_EPOCH`.

The base is the linux/amd64 manifest
`sha256:8607a9064d4a571140998ae9e52a3b3fcf9cff361d04642d5971e6cd76d39e27`
from index
`sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3`.
Neither a mutable tag nor runtime package installation is accepted authority.

## Host and container responsibilities

The root-owned host launcher verifies the exact schema-v7 profile bytes, local
image ID, RootFS chain, build-manifest label, runtime container ID/configuration,
actual Provider identity, and retained Edge identity. Container observations
must independently satisfy reviewed Runtime, Provider, and Edge canonical
policies before an authority candidate can be emitted; candidate configuration
cannot define policy. Its installed trust bundle lives under
`/usr/local/lib/codex-memory-native-runtime`, preserves the repository-relative
launcher/module layout, and is bound as a whole by the authority record. The
launcher checks that bundle digest before consulting Docker. The system Node
interpreter is an explicit host-trust-base component. The launcher starts Edge,
waits for bounded health, atomically emits a root-owned Edge receipt, re-verifies
all identities, and starts the exact pre-created runtime container. Stop retains
both containers and never stops the external Provider.

Provider policy `codex-memory-provider-container-policy/v4` models the admitted
historical `new-api-wsl` contract without treating its `/data` state volume as
an execution root. It requires the exact image-local absolute `/new-api`
entrypoint, rejects shell/interpreter indirection and every code bind mount,
binds image-inherited environment to the exact OCI config blob, deterministically
overlays the exact `PORT`, `SQLITE_PATH`, and `TZ` Compose contract, and admits
Docker's empty raw propagation field only for the exact local named volume as
the canonical `rprivate` semantic. It rejects arbitrary environment additions,
bind mounts, non-local drivers, driver options, and all other propagation values.
It admits only the named `/data` volume and loopback-only Compose network/port
contract. Provider image, container, configuration, revision, policy digest,
and volume/network identities remain independently bound by the root authority
and host launcher. Policy v4 separately pins the portable amd64 OCI manifest,
the config blob referenced by that manifest, the supported daemon-local image
identity, and the container's observed image identity. On the admitted Native
Docker/containerd store, the daemon and container identities equal the manifest
digest; they are never relabeled as the distinct config digest.

Every Provider admission performs a bounded host-local `docker image save` of
the exact daemon identity. A strict no-extraction archive parser recomputes the
OCI manifest and config blob hashes and proves that the daemon-local manifest
commits the accepted config bytes. This check requires no registry access,
does not inspect `/var/lib/docker`, and has no mutable-tag fallback. Unknown or
mixed image-store identity representations fail closed. Authority creation and
every host admission also extract
`/new-api` without following links, require a regular x86-64 ELF, and reject
container writable-layer changes outside the accepted `/data` state root. This
binds executable provenance to the exact image rather than trusting the
Entrypoint string alone.

Provider identity and health are separate gates. The accepted image has no
Docker `HEALTHCHECK`, so the launcher first verifies the exact Docker identity
and configuration, then performs a first-party bounded `GET` to the constant
loopback endpoint `http://127.0.0.1:3000/api/status`. It accepts only HTTP 200,
does not follow redirects, applies fixed header/body/time limits, and sends no
credential. A Provider receipt can report `healthy` only after both gates pass;
`Running=true` alone never establishes health, and a health response never
establishes identity.

The authority record uses
`codex-memory-native-runtime-authority/v3`, its profile authority component
projection uses `codex-memory-profile-runtime-authority-components/v3`,
Provider receipts use `codex-memory-provider-runtime-receipt/v2`, and Edge
receipts use `codex-memory-edge-runtime-receipt/v2`. Each carries distinct
fields for container configuration, daemon image identity, OCI manifest,
image-config blob, and image-store model. Legacy v1 records/receipts and
older authority/profile/Edge-receipt schemas cannot be interpreted under the
new semantics.

## Edge image supply-chain authority

An Edge container is never its own image trust root. The accepted chain begins
with the canonical Git commit and the repository's deny-all `.dockerignore`
allowlist. `generate-codex-memory-edge-context.js` materializes only those exact
Git blobs, adds the exact `.dockerignore` control file to the inventory, rejects
symlinks and undeclared inputs, and emits a deterministic USTAR context plus a
canonical `codex-memory-edge-build-manifest/v1` manifest. The manifest binds the
source commit/tree, pinned base index and platform manifests, package-lock
SHA-256, every admitted file, build tools, and `SOURCE_DATE_EPOCH`. The builder
opens that artifact once, verifies its operator-carried SHA-256 and complete
inventory, and sends those same bytes to BuildKit on stdin.

The exact OCI output is validated without host extraction. Admission hashes the
archive, manifest, config and every referenced layer, requires linux/amd64,
checks the exact revision label, and reconstructs the layered image view to
verify `/app/.build-source-commit` and `/app/package-lock.json`. For this
contract, `CODEX_MEMORY_R4_EDGE_ARTIFACT_SHA256` has one meaning: the SHA-256 of
the originally accepted exact Edge OCI archive. It is operator-carried during
authority creation and compared with the independently verified archive; a
future container environment can only repeat that accepted value.

The root authority separately binds the original archive, Edge build-context
and build-manifest digests, lockfile, source commit, OCI manifest, OCI config,
daemon image identity, and supported image-store model. On the admitted Native
Docker/containerd store the daemon ID and future `container.Image` equal the OCI
manifest digest; neither is relabeled as the distinct config digest. Every host
admission saves and strictly validates the exact daemon image locally, compares
its manifest/config/source/lockfile evidence to the root authority, applies the
independent Edge container policy, and only then checks health. A mutable tag or
revision label alone is never authority.

Edge policy `codex-memory-edge-container-policy/v3` independently fixes the
image-default `node apps/chatgpt-edge/external-main.js` entrypoint, empty
command, `/app` working directory, exact numeric runtime identity `1000:1000`,
an empty Docker supplementary-group set, and exact image healthcheck. The
process also verifies that its effective group set contains only GID 1000. It accepts only
the exact image-inherited environment plus the reviewed deployment-variable
set, validates secret values as file references below the dedicated secret
root, and rejects every extra variable. In particular, `NODE_OPTIONS`, altered
`PATH`, interpreter/command overrides, and executable paths below the secret
mount cannot be incorporated into a candidate-derived container digest.

The production secret source remains host-root controlled without making the
secret world-readable. Its parent chain is root-owned and non-writable by
group/other; the exact secret directory is `root:1000` mode `0750`, and each of
the four exact regular secret files is `root:1000` mode `0440`. The launcher
validates the source realpath, complete directory inventory, ownership, modes,
sizes, and distinct confined references before admission. The exact non-root
Edge process can read through the group bit, cannot write or replace the source
bytes, and receives the directory through a read-only bind mount.

The authority also binds the Edge binding digest and the bounded binding,
operator, host-project and previous-binding references. Secret values remain
separate file references rooted under `/run/secrets/codex-memory-r4`; they are
not copied into OCI layers, authority records, receipts, or build logs. Edge
lifecycle ownership remains `host_launcher` and Edge policy remains
`codex-memory-edge-container-policy/v3`.

The authority record and Provider/Edge receipts contain no secrets. Their installed files
are root-owned, non-writable by group/other, and readable by the non-root runtime
only through individual read-only bind mounts. Secret material uses the
root-controlled group-readable contract above and is never placed in either
receipt.

Authority creation re-verifies the digest-addressed OCI archive and requires
the imported local Docker image ID to equal its OCI manifest or config digest
(Docker's containerd image store reports the manifest digest as `.Id` on the
current Native host). It also requires the local ordered RootFS diff IDs to
match the archive. The mutable tag is never consulted after import.

The image-contained `container-supervisor` consumes the read-only authority
record, embedded build manifest, schema-v7 profile, and fresh Provider/Edge
receipts. It
does not inspect host Git, call Docker, or fall back to repository paths. It
owns only image-contained VCP/HTTP/governance/relay children.

Schema-v7 identifies that image-contained VCP with identity schema `2`. The
profile's VCP authority digest is derived from profile-authority components v3:
the build-manifest digest, accepted OCI archive and manifest identities, RootFS
chain, and exact VCP commit. The supervisor re-derives the same projection from
the independently validated Root Authority and embedded build manifest. Host
checkout contract schema `1`, arbitrary profile digests, and image-authority
substitution are rejected; the mutable Host VCP checkout is not consulted.

Every state-changing host operation is serialized by one root-owned `flock`
whose file descriptor spans the complete start, stop, activation, rollback, or
supervision command. Process exit or crash releases the kernel lock; a stale
pathname does not represent ownership. A second operation fails closed rather
than interleaving lifecycle transitions.

## Authority dependency graph

The graph is acyclic. Reviewed source defines the launcher, exact profile-byte
binding, independent policies, build-context rules, and native-closure gate.
Those inputs produce the root-owned host authority record. The record binds the
profile SHA-256, OCI/config/RootFS identities, exact pre-created Runtime,
Provider and Edge identities, policy digests, state-mount digest, native closure
digest, and installed launcher bundle. The launcher validates observed Docker
state against that record and policies, then emits boot/freshness-bound Provider
and Edge receipts. The read-only image consumes the record and receipts but
cannot mint or modify any of them. No application-side claim feeds back into
host authority creation.

Profile migration consumes a separately validated, profile-independent runtime
component projection; it does not consume the final authority record that will
later bind the profile. The resulting exact candidate bytes are hashed, and
only then may a final host authority candidate be assembled with that SHA-256.
This two-stage contract removes a profile/authority self-hash cycle.

The mandatory native build gate inventories every governed `.node` artifact,
requires the exact Vexus SHA-256, rejects RPATH/RUNPATH and ungoverned native
artifacts, resolves every `DT_NEEDED` library inside the image, and records each
library hash. Authority creation and every host admission re-read and hash the
actual files from the stopped container before accepting the closure digest.
Host library lookup is never accepted.

Rollback OCI archives use a private temporary file, complete verification,
file `fsync`, fail-closed atomic link publication, directory `fsync`, and
read-back verification. Archive inspection performs no filesystem extraction;
its bounded USTAR parser accepts only canonical regular files/directories,
rejects links, special nodes, traversal, duplicate paths and expansion limits,
and accepts only the OCI layout allowlist.

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

## Steady-state v7 generation rollover

Schema v7 is also the steady-state rollover contract: an accepted schema-v7
profile is carried forward to a deterministic schema-v7 next-generation
candidate, never downgraded and never re-bootstrapped.

`profileV7GenerationRolloverCandidate(currentProfile, nextAuthorityComponents,
{ expectedCurrentFingerprint })` requires the current profile schema to be
exactly 7 and its semantic fingerprint to equal the caller-supplied
`expectedCurrentFingerprint` (derived from the active authority's profile
binding). The 13 continuity fields are projected from the current profile via
`imageProfileFromAuthoritySeed()`; all generation fields come exclusively from
the next authority components and cannot be injected by callers. The candidate
is in-memory only, performs no durable write, and avoids the
profile/authority self-hash cycle by deriving exact candidate bytes before a
final authority binding.

The creator (`scripts/create-codex-memory-runtime-authority.js`) gains a
generation-rollover mode (`--generation-profile-source` +
`--current-authority` + `--expected-current-profile-fingerprint`): it reads the
OLD authority + OLD profile from the root sandbox, verifies
`sha256(profileBytes) === activeAuthority.profileSha256`, validates the profile
against the active authority, derives the next profile from the observed NEW
stopped container/image evidence, and only then binds the final authority. The
NEW Runtime must be stopped; a running NEW Runtime is rejected. The final
profile SHA-256 is recomputed from the derived bytes, eliminating the
self-hash cycle.

## Host generation transition primitive

`host-bootstrap/transition-runtime-generation.js` is a root administrative
primitive that moves a host from OLD bundle + OLD authority to NEW bundle + NEW
authority as a single orchestrated transaction:

1. ensure a root-owned journal root (`/var/lib/codex-memory/
   generation-transition`);
2. recover any interrupted prior transaction (journal + actual pair);
3. verify the OLD pair and the NEW candidate pair (exact 7-file bundle
   topology, root-owned files, no extra entries, no symlinks, no group/other
   writable bits);
4. verify lifecycle containers (OLD/NEW Runtime stopped, Edge healthy,
   Provider running);
5. prepare any missing ephemeral Edge/Provider receipt mount-source
   placeholders below `/run/codex-memory` with the installed launcher's
   canonical, idempotent bootstrap primitive;
6. write a durable `PREPARED` journal, preserve OLD authority bytes and OLD
   bundle bytes;
7. publish the NEW bundle atomically per file;
8. preserve an exact NEW-authority copy inside the journal as recovery
   evidence, re-read and byte-compare the authority's own admitted,
   root-owned `/etc/codex-memory/...` mount-source path, then pass that exact
   materialized path to the NEW installed launcher's `activate` (the only
   control-authority write path), require the returned authority digest and
   Runtime ID to match the admitted generation, follow with `verify`, and
   re-read the installed control authority immediately before commit;
9. write the durable `COMMITTED` journal.

Fixed production targets (install root, authority path, lifecycle lock, Node
executable, 7-file list) are hard-coded and never caller-settable. The control
authority is only ever written by the installed launcher's activation path.
A `flock`-based host lifecycle lock serializes transitions.

Crash model (documented, not overstated):

```yaml
concurrent_mutation_safe: true        # flock lifecycle lock
handled_process_error_rollback: true  # deterministic pair judgement
interrupted_process_recoverable: true # journal + actual pair
pair_power_loss_atomic: false         # two filesystem objects
```

On any handled failure the primitive judges the actual bundle/authority pair:
verified NEW+NEW is committed (`generation_transition_committed_after_failure`),
and every incomplete pair (NEW+OLD, OLD+NEW) is restored to OLD+OLD before
re-throwing the original failure. Interrupted recovery restores OLD bundle or
OLD authority from the journal backup and fails closed on unknown states. The
receipt bootstrap deliberately precedes `PREPARED`: it may create one or both
root-owned placeholder files even when no generation journal is created. A
partial bootstrap therefore means ephemeral prerequisite mutation only, not
that bundle/authority mutation began. On a handled helper failure, the
controller removes only files that were absent before this attempt and still
match a root-owned, no-follow-opened regular-file inode, then fsyncs the parent;
an unverifiable cleanup fails closed. Retrying is safe: existing receipt
sources are never cleanup candidates, missing sources are completed, and an
active Runtime or unsafe source path fails closed. Candidate-only mode never
performs this bootstrap. The primitive never starts, stops, creates, or deletes
containers and never mutates Edge or Provider container state.
Recovery performs the same execute-only bootstrap before installed-launcher
verification of a coherent NEW pair or a restored OLD pair, so loss of `/run`
across a reboot does not force rollback or make an interrupted transaction
unrecoverable.

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
