# Codex Memory Full-Stack Control

`scripts/codex-memory-stack.js` is the persistent, non-autostart lifecycle
entrypoint for the already provisioned owner runtime:

```bash
node scripts/codex-memory-stack.js start
node scripts/codex-memory-stack.js status
node scripts/codex-memory-stack.js stop
```

The command is intentionally a controller, not a provisioning or authorization
system. It does not install a watchdog, system service, login task, restart
policy, tunnel, deployment, release, migration, import, export, rebuild, or
public MCP expansion. An agent must still have current authorization for any
P3 startup or shutdown action before invoking it.

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

Profile schema v5 persists the exact accepted controller source commit, the
canonical VCPToolBox repository, selected VCP commit, declared-source digest,
the non-secret Governance/Relay configuration digests, and a digest of the
selected embedding model plus vector dimension alongside the container
bindings. The API key and other secret-bearing values are neither included in
those digests nor stored in the profile. The shim writes only an owner-only
freshness receipt containing the provider config file's device/inode/size/time
identity and its own PID/start identity. It contains no path, key, or key
digest. A provider key-file identity change therefore marks a running shim
unaccepted until a controlled stop/start refreshes it. Later changes to any
controller allowlisted path or non-secret managed runtime configuration require
new adoption; model or dimension drift fails closed before shim launch and
during live acceptance.
An existing schema-v4 profile remains readable for status, controlled shutdown,
and only the reviewed baseline-to-VCP bootstrap; it cannot represent accepted
runtime state. After this controller is merged, perform the one-time authorized
transition with `stop`, then `start`, then `adopt-running --replace`. The
transitioning `start` deliberately returns `accepted: false`,
`transitionRuntimeAccepted: true`, and `profileUpgradeRequired: true`; it does
not rewrite the owner profile. Adoption re-inspects the live process
environments and all acceptance gates before atomically storing v5. Once v5 is
stored, ordinary same-baseline restarts use only `start`.

## Start Semantics

`start` is optimized for the normal same-baseline restart:

1. require a clean local `main` equal to both the exact controller source
   commit stored by adoption and the locally known `origin/main`;
2. allow only this controller's delivery paths to differ from the accepted
   runtime baseline;
3. require the existing provider dependency to match the adopted container,
   image, revision, Compose service, and loopback port identity;
4. require Governance and Relay non-secret configuration to match their
   secret-redacted adopted digests;
5. require the profile-selected VCPToolBox revision, loaded source scope,
   embedding model, and dimension to match their accepted identities;
6. require a running shim's owner-only provider-config freshness receipt to
   match both its process start identity and the current config file identity;
7. require the retained Edge container to match the accepted revision and
   retain its non-root, read-only, no-restart, no-log, read-only-secret-mount,
   host-loopback-only posture across every published container port;
8. start shim, authenticated hardened HTTP MCP, default-closed Governance UDS,
   retained Edge, and outbound Relay plus observer in order;
9. run the native shim in the controller-managed process itself and prove that
   its recorded PID owns the 7615 loopback listener before any capability
   preflight can send a bearer token;
10. prove through Linux `/proc` socket metadata that the recorded HTTP PID owns
   the exact loopback listener before reading or sending its bearer token;
   validate authenticated full HTTP health and its hardened,
   no-external-provider, read-only public surface, native-write-off,
   cache/shadow/vector-write-off, and automatic-rebuild-off policy;
11. bind the Governance control UDS and Relay observer UDS path/inode to their
   recorded managed PIDs before and after each low-disclosure probe, then
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
listener. It is bound back to the pinned canonical VCPToolBox runtime, isolated
store, governed mapping, loopback provider dependency, provider-file freshness,
and native-write-off posture.

Each managed child is released from the controller's process handle only after
its owner-only PID file is durably written. If PID persistence fails, the
controller sends `SIGTERM` to the newly created process group and waits for
Linux to confirm that the complete group has exited. It reports a distinct
incomplete-cleanup failure if exit cannot be proved, rather than claiming that
an unmanaged listener was removed. It never escalates to `SIGKILL`.

If runtime-critical source, the accepted baseline, owner profile, or Edge
container changes, startup fails closed. Reprovision and complete a fresh
exact-baseline acceptance instead of using `--force`.

## Status And Stop

`status` performs the same authenticated, full hardened-policy HTTP probe used
by startup and adoption, but only after the HTTP command is controller-managed
and the loopback listener belongs to its recorded PID. It returns only
booleans for managed-configuration and provider-credential freshness alongside
counters, schema versions, baseline identity, and bounded policy failure codes.
It does not return private paths, file identities, environment values, tokens,
keys, key digests, raw memory, request bodies, or provider responses.

A legacy HTTP process remains running, but a newer controller marks it
`controllerManaged: false` and does not read or send its bearer token. A
controller-managed process from a revision that predates the bounded policy
fields is likewise unaccepted. After this controller is merged, restoring
exact-head acceptance requires a separately authorized `stop` and `start` from
canonical `main`, followed by `adopt-running --replace`. PR validation does not
perform that lifecycle transition.

`stop` first revalidates the retained binding and the exact adopted Edge
container ID, revision, and security posture. It then sends `SIGTERM` only to
processes whose owner-only PID file, Node executable, working directory, exact
script/mode, and applicable environment-file identity match the adopted
component. It stops but does not remove the retained Edge container. It never
escalates to `SIGKILL`.
