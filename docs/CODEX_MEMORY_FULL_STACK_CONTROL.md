# Codex Memory Full-Stack Control

`scripts/codex-memory-stack.js` is the persistent, non-autostart lifecycle
entrypoint for the already provisioned owner runtime:

```bash
node scripts/codex-memory-stack.js start
node scripts/codex-memory-stack.js status
node scripts/codex-memory-stack.js stop
node scripts/codex-memory-stack.js rebind-source
```

The command is intentionally a controller, not a provisioning or authorization
system. It does not install a watchdog, system service, login task, restart
policy, tunnel, deployment, release, migration, import, export, rebuild, or
public MCP expansion. An agent must still have current authorization for any
P3 startup or shutdown action before invoking it.

## Canonical Codex MCP Endpoint

The endpoint role is schema-bound:

```text
schema v6        -> canonical Codex MCP on loopback port 7625
schema v4 or v5  -> historical/rollback HTTP MCP on loopback port 7605
```

Both roles use `/mcp/codex-memory`, but they are not interchangeable runtime
authorities. The older standalone `7625` launcher inherited caller environment
and defaulted to the local/observe/fallback policy. The schema-v6 controller
instead launches the canonical endpoint from a clean allowlisted environment
and forces the hardened, authenticated, strict-primary, write-free policy.
The common source tool contract therefore does not make the two launch
policies equivalent.

During the v5-to-v6 transition, `stop` continues to recognize and stop the
adopted `7605` process. The transitional `start` uses an in-memory v6 binding
and launches the controller-owned HTTP child on `7625`. It fails closed if
that port is already occupied; it never kills, adopts, or reuses an unknown or
standalone listener. `adopt-running --replace` can persist schema v6 only after
the canonical listener, authentication, exact five-tool read/proposal surface,
and complete hardened policy pass acceptance.

The historical supervisor cannot start or restart either its MCP or shim role
on `7625`. Its only startable compatibility topology is exact loopback MCP
`7605` plus shim `7615`. Its stop path must bind the owner PID file, process
owner, exact executable, process group, working directory, exact supervisor
command, stable pre-signal start ticks, and an unchanged PID-file inode before
sending a signal. This is an identity-checked compatibility stop, not a
schema-v6 lifecycle or listener-acceptance authority.

Authenticated health exposes only the bounded policy facts needed by the
controller, including bridge gate mode, native read-delegation mode, and the
public tool names/count. Acceptance requires `strict`, `primary`, and exactly
the five canonical read/proposal tools; `observe`, local fallback, missing or
extra tools, and reordered/substituted tool names fail closed.

## One-Time Adoption

After a full stack has passed its exact-baseline acceptance, bind the controller
to that running stack:

```bash
node scripts/codex-memory-stack.js adopt-running
```

Adoption reads process command metadata, container security metadata, and the
minimum owner-only references needed for governed probes. It does not store,
return, or copy environment values into the profile. The profile contains the
accepted Git baseline, exact retained Edge container identity, exact accepted
NewAPI container/image/revision identity, the independently accepted
retained-binding source identity, the exact accepted runtime repository, and
relative references to existing owner-only environment and binding files.
It also stores digests of the non-secret Governance and Relay configuration
projection: secret-bearing values are replaced by a fixed presence marker
before hashing, while endpoints, modes, public/key IDs, and private references
remain identity-bound without being returned.
Before writing the profile, adoption validates the exact process executable,
script, mode and environment-file identities, restricts managed environment
files to governed `CODEX_MEMORY_R4_*` and `CODEX_MEMORY_R5_*` names, validates
the provider container's recognized image metadata and exact loopback port
binding, and runs the complete low-disclosure runtime acceptance. The retained
binding may predate the runtime baseline, but its accepted source identity
cannot drift without a new adoption. Use `--replace` only after a newly
provisioned stack has completed a fresh exact-baseline acceptance.

Run adoption only from the exact repository bound to the running HTTP process.
That repository must be clean and its current `main` must equal the locally
known `origin/main`. A sibling worktree or feature branch cannot adopt a runtime
owned by another checkout. Adoption writes the profile only when the complete
inspection is immediately accepted, including source identity and all runtime
gates.

Adoption accepts only processes launched through this controller's exact
`_run-* --stack-environment=...` commands. Legacy process identities remain
recognizable only for a controlled shutdown of an already adopted stack; they
cannot become a new accepted profile or be mixed into an accepted restart.
The candidate process environment read from Linux `/proc` must also exactly
match the controller-built, allowlisted environment, including the isolated
runtime root and retained binding. No environment values are returned. For
HTTP, these checks specifically keep legacy or substituted storage paths and
initialization side effects outside the adoption boundary.

The accepted codex-memory baseline also selects one fixed VCPToolBox Git
revision. Before acceptance or shim launch, the controller requires that
revision to equal the local `origin/main`, requires the canonical sibling
repository identity, and requires the declared native-recall source scope to be
tracked, present, and unchanged from that revision. Unrelated VCPToolBox plugin
working-tree state is not executed by this shim and is outside the declared
scope; any drift in the loaded source files, Rust module, or dependency
manifests fails closed.

Profile schema v6 persists a versioned controller runtime-source manifest
digest plus the repository HEAD at adoption time. The manifest binds the
tracked mode and byte-level SHA-256 of every file in the fixed broad runtime
roots: all of `src/`, the ChatGPT Edge runtime, the Local Recall Relay, the
ChatGPT memory-scope widget loaded by Edge, the ChatGPT R4 contracts package,
all of `scripts/`, the manifest itself, and the package manifests. Because
this does not infer dependencies from JavaScript syntax, aliases or dynamic
module loading cannot omit a repository runtime file from the identity. The
adopted repository HEAD remains an audit and
ancestor-continuity anchor; later committed governance/docs/test changes do not
invalidate the runtime when the manifest digest is unchanged. A changed,
missing, newly added, untracked, symlinked, or mode-drifted file inside a bound
root still fails closed.

Manifest inspection takes `O_NOFOLLOW` descriptor snapshots and requires each
path and descriptor to retain the same owner-visible inode, mode, size, and
nanosecond timestamps before and after the read; the bytes must also reproduce
the exact Git `HEAD` blob object. The sole fallback is path- and
HEAD-attributes-aware CRLF-to-LF canonicalization for `*.ps1` files explicitly
marked `text eol=crlf`, with no `ident`, `filter`,
`working-tree-encoding`, legacy `crlf`, NUL byte, mixed line ending, or nested
attribute override. The exact root `.gitattributes` policy is itself bound by
the manifest. The aggregate digest still binds the exact worktree bytes.
Lifecycle operations therefore require a quiescent owner worktree. Concurrent
same-owner checkout or source replacement is unsupported and fails closed when
observed. This is not a claim that a mutable checkout is an immutable runtime
image.

The profile also persists the canonical VCPToolBox repository, selected VCP
commit, declared-source digest, the non-secret Governance/Relay configuration
digests, and a digest of the selected embedding model plus vector dimension
alongside the container bindings. The API key and other secret-bearing values
are neither included in those digests nor stored in the profile. The shim,
Governance, and Relay each write an owner-only schema-v2 freshness receipt
containing the controller manifest identity, their PID/start identity, and the
device/inode/size/time identity of the private files they loaded.
Governance binds its context signing private key, diary-scope mapping, Edge
signing public key, native HTTP token, operator-subject fingerprint, and
project registry as one identity set. Relay binds its auth token and three
signing-key files as another identity set. These receipts contain no private
path, private content, secret digest, key digest, or environment value. A bound-file
identity change therefore marks the corresponding running process unaccepted
until a controlled stop/start refreshes it. Later changes to any controller
manifest file or non-secret managed runtime configuration require new
adoption; model or dimension drift fails closed before shim launch and during
live acceptance.

Existing schema-v4 and schema-v5 profiles remain readable for status and
controlled shutdown; neither can represent accepted schema-v6 runtime state.
Only the reviewed schema-v4 baseline mapping and the exact schema-v5 controller
commit `48ecfe1c74e1cf5b6be9a56ffa82998eeb26567e` may bootstrap the one-time
authorized transition. Run `stop`, then `start`, then
`adopt-running --replace`. The transitioning `start` launches only
manifest-bound schema-v6 children and deliberately returns `accepted: false`,
`transitionRuntimeAccepted: true`, and `profileUpgradeRequired: true`; it does
not rewrite the owner profile. Adoption re-inspects the live process
environments and all acceptance gates before atomically storing v6. Once v6 is
stored, ordinary manifest-matched restarts use only `start`.

## Schema-V6 Source-Manifest Rebind

An existing schema-v6 profile intentionally rejects ordinary `start` after a
runtime-source manifest change. The explicit same-schema transition is:

```bash
node scripts/codex-memory-stack.js stop
node scripts/codex-memory-stack.js rebind-source
node scripts/codex-memory-stack.js status
```

`rebind-source` is not a source override and does not weaken normal `start`.
It accepts only an existing schema-v6 profile whose adopted repository head is
readable and ancestral to a clean canonical `main == origin/main`, whose
current manifest is complete and scope-clean, and whose manifest digest and
repository head have both advanced. An unchanged manifest, dirty worktree,
non-main checkout, non-descendant history, missing manifest path, untracked
runtime source, legacy profile, or incomplete manifest fails before startup.
Low-disclosure `status` reports only the categorical
`sourceManifestRebindEligible` result alongside the existing source facts; it
does not return either manifest digest.

The command also requires every managed process and the retained Edge
container to be stopped. It preserves the existing provider, VCPToolBox,
retained binding, owner-only environment references, non-secret configuration
digests, container identities, model/dimension binding, and runtime baseline.
It changes only the schema-v6 profile's adopted repository head and controller
source-manifest identity.

The candidate profile remains in memory while the controller starts the
fully stopped stack. The candidate runtime must pass the same complete source,
process, listener, authenticated HTTP policy, private-file freshness,
Governance, Relay, provider, VCPToolBox, and Edge acceptance used by normal
startup. Immediately before persistence, source compatibility and full runtime
acceptance are checked again. Only then is the owner-only profile atomically
replaced.

If candidate startup fails, ordinary startup rollback stops only components
started by that invocation. On successful startup, the internal start path
returns the exact component-name set it actually started to the rebind
coordinator; this evidence is not added to the public CLI result. If the
candidate runtime is not exactly accepted or profile persistence fails,
`rebind-source` rolls back only that returned set and retains the prior
profile. A rollback failure is terminal and reported separately. A process
that appeared after the stopped-stack preflight but was not proven to be
started by this transition is not terminated by the coordinator.

This command requires current P3 lifecycle authorization. Source tests and CI
do not execute it, access private configuration, start services, call a
provider, or prove a live exact-head runtime.

## Start Semantics

`start` is optimized for the normal manifest-matched restart:

1. require a clean local `main` equal to the locally known `origin/main`, with
   the adopted repository HEAD still readable and ancestral;
2. enumerate the fixed manifest roots and require their canonical aggregate
   digest to equal the schema-v6 profile, while allowing committed non-runtime
   governance/docs/test changes outside those roots;
3. require the existing provider dependency to match the adopted container,
   image, revision, Compose service, and exact
   `127.0.0.1:3000` publication used by the shim;
4. require Governance and Relay non-secret configuration to match their
   secret-redacted adopted digests;
5. require the profile-selected VCPToolBox revision, loaded source scope,
   embedding model, and dimension to match their accepted identities;
6. require running shim, Governance, and Relay owner-only freshness receipts
   to match their process start identities and current provider/private-file
   identities;
7. require the retained Edge container to match the accepted revision and
   retain its non-root, read-only, no-restart, no-log, read-only-secret-mount,
   host-loopback-only posture across every published container port; while
   Edge is stopped, validate its persistent `HostConfig.PortBindings`, then
   after `docker start` separately require the live
   `NetworkSettings.Ports` to remain loopback-only;
8. start shim, authenticated hardened HTTP MCP, default-closed Governance UDS,
   retained Edge, and outbound Relay plus observer in order;
9. run the native shim in the controller-managed process itself and prove that
   its recorded PID owns both the existing 7615 native-MCP listener and the
   separate 7616 governed-attempt listener before Governance or any capability
   preflight can dispatch work; 7616 is the canonical fixed governed-attempt
   port, and a non-canonical environment or CLI override is rejected before
   runtime construction;
10. prove through Linux `/proc` socket metadata that the recorded HTTP PID owns
   the exact loopback listener before reading or sending its bearer token;
   validate authenticated full HTTP health and its hardened,
   no-external-provider, read-only public surface, native-write-off,
   cache/shadow/vector-write-off, and automatic-rebuild-off policy;
11. bind both the Governance control and Relay-data UDS path/inode to the
   recorded Governance PID, bind the Relay observer UDS to the recorded Relay
   PID, and bind the established Relay-data connection's Linux peer inode to
   the exact Governance PID before every payload write, then
   validate schema-v3 governance observation, schema-v1 relay observation, and
   Edge health;
12. stop only components newly started by that invocation if any gate fails.

`start`, `stop`, and profile adoption share an owner-only atomic lifecycle
lock. `start` and `stop` acquire that lock before reading the owner profile, so
the binding snapshot cannot race a concurrent `adopt-running --replace`.
A concurrent lifecycle invocation fails closed, and a crash-left lock is
removed only after its recorded PID is dead or Linux proves that PID has a
different `/proc` start identity, and the lock inode is then revalidated.

The controller never performs `record_memory`. HTTP write delegation, write
tool exposure, candidate cache, shadow writes, vector-index writes, and
automatic rebuilds are forced off by the managed HTTP child.
Hardened soft-read, lifecycle-read, and write-preflight policy checks are
forced on even though no public or delegated write path is enabled.
Caller-supplied root, write-enable, provider, preload, Node option/debug/trace,
and public tool-surface overrides are removed before managed children start.
Managed children inherit no caller environment except a system-only pinned
`PATH`; every required runtime value is then added explicitly from an
allowlisted owner environment or the controller itself. This also excludes
shell startup hooks, Node preload/debug settings, dynamic-linker injection
variables such as `LD_AUDIT`, and unrelated credential-bearing variables.
Owner-only runtime environment files are parsed and allowlisted before child
launch; they are not passed through Node's pre-bootstrap `--env-file` handling.
The shim is launched directly with the controller's verified
`process.execPath`, without a shell or wrapper child; the managed PID owns the
two loopback listeners. The native-MCP listener retains its existing bearer
binding. The attempt-only listener accepts the bounded
`governed_read_attempt.v1` working set only when the loopback request carries
the existing Governance runtime-binding digest in its private HTTP binding
header; it introduces no second signing secret or public endpoint. It is bound
back to the pinned canonical VCPToolBox runtime, controller-owned per-attempt
lease root, governed mapping, loopback provider dependency,
provider/Governance/Relay private-file freshness, and native-write-off posture.
The Relay child receives the controller-verified Governance PID, captures its
Linux start identity before loading its runtime, and refuses to start unless
that exact process owns the configured data UDS. Its forwarder checks the same
path ownership before connecting and again after connection. Before writing
the encoded request payload, it also maps the established client socket to its
Linux `SO_PEERCRED` identity through an isolated, fixed-source
`/usr/bin/python3 -I -S` helper and requires the kernel-reported PID/UID/GID to
match Governance. The helper receives only the connected socket descriptor;
it receives no request payload, private path, token, key, or inherited runtime
environment. A restored pathname therefore cannot authorize a connection
already established to another local process. Identity drift is a terminal
fail-closed error rather than a retryable availability condition.

Each managed child is released from the controller's process handle only after
its owner-only PID file is durably written. If PID persistence fails, the
controller sends `SIGTERM` to the newly created process group and waits for
Linux to confirm that the complete group has exited. It reports a distinct
incomplete-cleanup failure if exit cannot be proved, rather than claiming that
an unmanaged listener was removed. It never escalates to `SIGKILL`.

If runtime-critical source, the accepted baseline, owner profile, or Edge
container changes, startup fails closed. Reprovision and complete a fresh
exact-baseline acceptance instead of using `--force`.

## VCP Runtime Contract and Build Identity

Schema-v6 supports two explicit VCP identity modes. Profiles without
`vcpRuntimeIdentitySchemaVersion` retain the legacy exact-build contract:
their accepted VCP commit and scoped content digest must match exactly. A
legacy mismatch never auto-migrates or auto-accepts the observed checkout.

Profiles with `vcpRuntimeIdentitySchemaVersion: 1` additionally bind
`vcpRuntimeContractDigest`. The digest combines the codex-memory static policy
projection with Git-authenticated evidence from the configured canonical VCP
checkout. The static policy covers the repository binding, governed-read
protocol, public native capability allowlist, project-scoped read policy,
disabled durable-write and global-search policies, and the governed Provider
boundary. The VCP evidence binds the content and Git blob identity of the
security roots, their statically resolvable local dependency closure, required
interface shapes, and the exact lockfile identities of external packages used
by that closure.

Required export names are necessary compatibility checks, not sufficient
contract evidence. Changing a security root body or any transitive local or
external security dependency changes the contract digest and requires explicit
reacceptance. Missing, unreadable, untracked, symlinked, path-escaping, or
worktree-divergent evidence fails closed; a security-relevant dynamic local
dependency that cannot be resolved statically also fails closed. Dependency
analysis accepts only unshadowed direct loaders with literal specifiers and
static ESM declarations. Loader aliases, computed specifiers, `createRequire`,
and unsupported execution indirection make the entire contract evidence
unavailable; no partial evidence digest or migration package is produced. An
unrelated VCP implementation file remains outside this evidence closure, so a clean
routine update to such a file changes only the observed build identity. The
top-level package manifest is Git-validated and contributes repository identity
and build observation, but unrelated version or script metadata is not treated
as a memory-security contract change; external packages actually used by the
security closure remain bound through their exact lockfile entries.

The observed build identity is separate audit evidence: repository head,
complete tree digest, package-manifest digest, scoped content digest, clean
state, and observation time. A clean `main == origin/main` build may change
without changing the accepted contract and without rewriting the owner
profile. Any tracked or untracked worktree change remains a hard failure.

Migration from legacy schema-v6 is explicit. The controller can construct and
validate an in-memory migration package containing the observed contract and
build evidence, the exact current canonical profile fingerprint, the validated
next profile, and the matching inputs for the existing atomic owner-profile
transaction. A stale package therefore cannot overwrite a changed profile.
Package construction is deterministic and side-effect free; persistence still
requires a separately authorized transition and never retries automatically.

This source candidate does not migrate the real owner profile, accept the
current VCP contract, deploy the identity model, start the runtime, or establish
that B2 has passed.

## Selected-Diary Production Hydration

The schema-v6 managed shim is launched with the canonical VCPToolBox
`dailynote` root, its canonical primary `VectorStore`, a controller-owned
isolated store, and an explicit `--selected-diary-hydration` gate. The shim
advertises `selectedDiaryHydrationConfigured: true` in low-disclosure
`initialize` and `tools/list` metadata only when that production hydrator is
actually installed. R5-N capability preparation requires the flag on both
responses; an older or substitute shim fails before native execution.

After the governed mapping has resolved an exact diary allowlist, the
production source projection opens only the primary `knowledge_base.sqlite`
database in read-only, `query_only` mode. A first short read transaction
validates source identity, schema, scoped files/chunks, sparse indexes, vector
dimension and finite values, and budgets, then emits only a bounded projection
plan plus digest. It closes before the single query-embedding provider call.

That provider call runs in one fresh Shim-owned helper process, not in the
derived-store lease child. Provider authority crosses only its exact IPC
handle; argv and the minimal child environment contain no provider key or Edge
token, and stdout/stderr are ignored. Cancellation or timeout sends `SIGTERM`
only to the exact helper and waits for exit before the single native-attempt
slot can be reused. Failure to prove exit latches cleanup closed instead of
leaving an unresolved provider promise under reusable admission.

The lease child reopens the same source identity, starts a second read
transaction, and recomputes the selected-projection digest. A changed digest
fails as `source_snapshot_changed_after_preflight` before any derived
transaction. A matching snapshot stays open while rows stream into a fresh
derived SQLite store in one atomic transaction; the complete projection is
never retained in memory. The path does not scan diary files, re-embed stored
content, read tags, call a second provider, or modify the primary database.

The boundary is exact rather than best-effort:

- the VCP root, canonical `dailynote`, canonical `VectorStore`, isolated store,
  and both opened SQLite handles must resolve to their expected non-symlink
  locations;
- the isolated store must remain outside the VCP source tree and must not
  overlap the primary store;
- the allowlist is bounded to eight exact diary names, and every selected path
  and vector must match its diary, dimension, finite-value, count, and byte
  budgets;
- selected `chunk_index` values must be non-negative, unique, and strictly
  ordered per file, but may be non-contiguous because VCP retains the source
  index while omitting chunks without a usable vector;
- any cross-scope row, secondary tag/cache/migration state, partial write,
  changed database handle, or stale isolated projection fails closed instead
  of being overwritten.

A source or hydration failure is preserved only through the canonical
attempt-v1 failure registry; raw database or runtime detail is discarded, and
local memory fallback remains forbidden.

The returned receipt contains only acceptance booleans and aggregate
diary/file/chunk counts. It contains no diary name, path, content, vector,
token, provider response, or raw database output. This wiring neither changes
the public MCP tool surface nor authorizes a private read. Source and fixture
tests establish the contract; a successful exact-head private runtime proof
still requires separate, current P3 authorization.

## Status And Stop

`status` performs the same authenticated, full hardened-policy HTTP probe used
by startup and adoption, but only after the HTTP command is controller-managed
and the loopback listener belongs to its recorded PID. It returns only
booleans for managed-configuration, listener identities, and
provider/Governance/Relay credential freshness alongside counters, schema
versions, baseline identity, and bounded policy failure codes. It does not
return private paths, file identities, environment values, tokens, keys, key
digests, raw memory, request bodies, or provider responses.

The low-disclosure Edge projection also binds the source contract dimensions:
data response schema `2`, request and response envelope schema `2`,
`governed_read_attempt.v1`, and `legacyV1Accepted: false`. These are source and
acceptance facts, not proof that a stopped instance has already been rebound or
started.

The Shim projection independently requires the recorded Shim PID to own both
loopback listeners and reports only the attempt protocol plus listener-identity
booleans. Governance loads the v2 attempt runtime, keeps
`resolve_memory_context` outside attempt admission, and routes every other data
read through the bound Bridge/Shim listener. The former Governance application
read path is not retained as an active v1 compatibility route.

A v4/v5 profile makes `status` inspect the historical `7605` role so that
controlled transition and shutdown remain possible. A v6 profile makes it
inspect the canonical `7625` role and reports that role in the low-disclosure
HTTP projection. Consequently, a healthy v5 status is not evidence that a
separate Codex client target on `7625` is reachable.

A legacy HTTP process remains running, but a newer controller marks it
`controllerManaged: false` and does not read or send its bearer token. A
controller-managed process from a revision that predates the bounded policy
fields is likewise unaccepted. After this controller is merged, restoring
exact-head acceptance from schema v4/v5 requires a separately authorized
`stop` and `start` from canonical `main`, followed by
`adopt-running --replace`. A schema-v6 profile with a changed source manifest
instead requires the separately authorized stopped-stack `rebind-source`
transition above. PR validation performs neither lifecycle transition.

`stop` first revalidates the retained binding and the exact adopted Edge
container ID, revision, and security posture. A later `start` validates the
stopped container's persistent loopback publication configuration before
starting that exact ID, then validates the live publication again before
acceptance. It sends `SIGTERM` only to
processes whose owner-only PID file, Node executable, working directory, exact
script/mode, and applicable environment-file identity match the adopted
component. Relay `SIGTERM` aborts only an Edge claim poll that has not returned
a claim. Once Edge has returned a claim, Relay finishes acknowledgement, UDS
processing, and Edge completion so a controlled stop cannot strand an
acknowledged request. Its 120-second controller wait covers the configured
30-second acknowledgement, 55-second UDS, and 30-second completion maxima plus
bounded overhead. The shim receives a 45-second wait because its governed
shutdown may first wait up to 25 seconds for the attempt listener's retained
handlers and exact lease workers, then close the existing knowledge-base
manager and drain its derived work. HTTP also receives 45 seconds so
`server.close()` can settle the controller-pinned
30-second maximum active request before application close. Governance retains
the 10-second wait. The controller stops but does not remove
the retained Edge container, and it never escalates to `SIGKILL`.
