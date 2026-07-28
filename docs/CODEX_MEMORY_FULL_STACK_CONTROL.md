# Codex Memory Full-Stack Control

`scripts/codex-memory-stack.js` is the persistent, non-autostart lifecycle
entrypoint for the already provisioned owner runtime:

```bash
codex-memory-stack start
codex-memory-stack status
codex-memory-stack stop
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

Adoption reads process command metadata and container security metadata. It
does not read or copy environment-file values. It writes an owner-only profile
containing only the accepted Git baseline and relative references to existing
owner-only environment and binding files. Use `--replace` only after a newly
provisioned stack has completed a fresh exact-baseline acceptance.

## Start Semantics

`start` is optimized for the normal same-baseline restart:

1. require a clean local `main` equal to the locally known `origin/main`;
2. allow only this controller's delivery paths to differ from the accepted
   runtime baseline;
3. require the existing provider dependency;
4. require the retained Edge container to match the accepted revision and
   retain its non-root, read-only, no-restart, no-log, read-only-secret-mount,
   host-loopback-only posture;
5. start shim, authenticated hardened HTTP MCP, default-closed Governance UDS,
   retained Edge, and outbound Relay plus observer in order;
6. validate HTTP health, sockets, schema-v3 governance observation, schema-v1
   relay observation, and Edge health;
7. stop only components newly started by that invocation if any gate fails.

The controller never performs `record_memory`. HTTP write delegation, write
tool exposure, candidate cache, shadow writes, vector-index writes, and
automatic rebuilds are forced off by the managed HTTP child.
Caller-supplied root, write-enable, provider, preload, Node option, and public
tool-surface overrides are removed before managed children start; the shim is
bound back to the canonical workspace runtime, isolated store, governed mapping,
loopback provider dependency, and native-write-off posture.

If runtime-critical source, the accepted baseline, owner profile, or Edge
container changes, startup fails closed. Reprovision and complete a fresh
exact-baseline acceptance instead of using `--force`.

## Status And Stop

`status` returns only booleans, counters, schema versions, baseline identity,
and safe lifecycle states. It does not return private paths, environment
values, tokens, keys, raw memory, request bodies, or provider responses.

`stop` sends `SIGTERM` only to processes whose owner-only PID file and command
identity match the managed component. It stops but does not remove the retained
Edge container. It never escalates to `SIGKILL`.
