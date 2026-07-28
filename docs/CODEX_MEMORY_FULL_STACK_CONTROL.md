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

## Start Semantics

`start` is optimized for the normal same-baseline restart:

1. require a clean local `main` equal to the locally known `origin/main`;
2. allow only this controller's delivery paths to differ from the accepted
   runtime baseline;
3. require the existing provider dependency to match the adopted container,
   image, revision, Compose service, and loopback port identity;
4. require the retained Edge container to match the accepted revision and
   retain its non-root, read-only, no-restart, no-log, read-only-secret-mount,
   host-loopback-only posture;
5. start shim, authenticated hardened HTTP MCP, default-closed Governance UDS,
   retained Edge, and outbound Relay plus observer in order;
6. validate authenticated full HTTP health and its hardened,
   no-external-provider, read-only public surface, native-write-off,
   cache/shadow/vector-write-off, and automatic-rebuild-off policy; then
   validate sockets, schema-v3 governance observation, schema-v1 relay
   observation, and Edge health;
7. stop only components newly started by that invocation if any gate fails.

`start`, `stop`, and profile adoption share an owner-only atomic lifecycle
lock. A concurrent lifecycle invocation fails closed, and a crash-left lock is
removed only after its recorded PID is dead and its inode is revalidated.

The controller never performs `record_memory`. HTTP write delegation, write
tool exposure, candidate cache, shadow writes, vector-index writes, and
automatic rebuilds are forced off by the managed HTTP child.
Hardened soft-read, lifecycle-read, and write-preflight policy checks are
forced on even though no public or delegated write path is enabled.
Caller-supplied root, write-enable, provider, preload, Node option/debug/trace,
and public tool-surface overrides are removed before managed children start.
Shell startup and trace injection variables such as `BASH_ENV`, `ENV`,
`SHELLOPTS`, and `PS4` are also removed and `PATH` is pinned to system
binaries. Owner-only runtime environment files are parsed and allowlisted
before child launch; they are not passed through Node's pre-bootstrap
`--env-file` handling. The shim is launched directly with the controller's
verified `process.execPath`, without a shell, and is bound back to the canonical
workspace runtime, isolated store, governed mapping, loopback provider
dependency, and native-write-off posture.

Each managed child is released from the controller's process handle only after
its owner-only PID file is durably written. If PID persistence fails, the
controller terminates the newly created process group and reports a fail-closed
error instead of leaving an unmanaged listener.

If runtime-critical source, the accepted baseline, owner profile, or Edge
container changes, startup fails closed. Reprovision and complete a fresh
exact-baseline acceptance instead of using `--force`.

## Status And Stop

`status` performs the same authenticated, full hardened-policy HTTP probe used
by startup and adoption. It returns only booleans, counters, schema versions,
baseline identity, and bounded policy failure codes. It does not return private
paths, environment values, tokens, keys, raw memory, request bodies, or
provider responses.

An already running HTTP process from a revision that predates these bounded
policy fields remains running, but a newer controller reports its policy shape
as unaccepted. After this controller is merged, restoring exact-head acceptance
requires a separately authorized `stop` and `start` from canonical `main`,
followed by `adopt-running --replace`. PR validation does not perform that
lifecycle transition.

`stop` first revalidates the retained binding and the exact adopted Edge
container ID, revision, and security posture. It then sends `SIGTERM` only to
processes whose owner-only PID file, Node executable, working directory, exact
script/mode, and applicable environment-file identity match the adopted
component. It stops but does not remove the retained Edge container. It never
escalates to `SIGKILL`.
