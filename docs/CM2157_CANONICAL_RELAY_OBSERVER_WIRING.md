# CM-2157 Canonical Relay Observer Wiring

Status: `SOURCE_IMPLEMENTED_VALIDATED_NOT_RUNTIME_VERIFIED`

Validation: `CMV-2242`

## Outcome

The canonical Local Recall Relay source now creates the existing
low-disclosure lifecycle observer, injects its `observe` function into the
outbound Relay runtime, and exposes only its validated snapshot through an
owner-only, read-only Unix-domain socket.

This is a source/test/docs delivery. It did not start the real Relay, read or
change real private configuration, read secret references, call a provider or
MCP runtime, access memory, deploy, release, or make a readiness claim.

## Canonical Wiring

`apps/local-recall-relay/outbound-main.js` now uses one fail-closed factory:

```text
create low-disclosure observer
  -> create owner-only snapshot UDS
  -> load Relay runtime with eventSink=observer.observe
  -> start snapshot UDS before Relay polling
  -> stop snapshot UDS on every service exit
  -> reset service running state even when snapshot shutdown fails
```

The canonical factory requires
`CODEX_MEMORY_R5_RELAY_OBSERVER_UDS_PATH`. Missing or blank source
configuration fails before the secret-bound Relay runtime loader runs. This
repository change does not assign or apply a real value.

## Owner-Only Snapshot Contract

The configured socket path must:

- be absolute, normalized, canonical, NUL-free, and at most 100 UTF-8 bytes;
- have a non-symlink canonical parent owned by the current process user;
- have no group or other permissions on that parent;
- retain the same parent device/inode identity across bind;
- resolve to a socket owned by the current process user with exact mode
  `0600`.

Before binding, the canonical parent authority is revalidated before stale
inspection and again immediately before unlink. A pre-existing path is removed
only when it remains under that same current-UID, owner-only parent, is a
current-UID socket, a bounded connection probe returns `ECONNREFUSED`, and a
second `lstat` confirms the same device/inode. The stale socket may have an
umask-derived mode so a crash between bind and the final `0600` chmod remains
recoverable; this exception never weakens the exact `0600` post-bind check. An
active socket, a vanished path, parent or socket identity drift, a non-socket,
an ownership mismatch, and every uncertain probe result are never unlinked.
Active and uncertain collisions fail closed.

The stale-path check, unlink, rebind, chmod, and post-bind validation are held
under a deterministic per-UID/per-path Linux abstract UDS startup lock. The
kernel releases that lock on process death, it carries no request or response
surface, and the code releases it only after the snapshot socket is bound and
validated. Concurrent recovery attempts therefore fail closed without
unlinking the winner's live socket.

The surface accepts exactly one newline-terminated request:

```json
{"schema_version":1,"operation":"snapshot"}
```

The response contains exactly:

```json
{
  "schema_version": 1,
  "operation": "snapshot",
  "observation": {
    "schema_version": 1,
    "component": "outbound_relay"
  }
}
```

The abbreviated observation above documents the envelope only. Runtime output
must pass the full exact-key projection before serialization. Extra fields,
unsafe error codes, invalid counters, inconsistent failure state, or any
retention flag other than `false` close the connection without a response.

The UDS:

- accepts at most four concurrent connections;
- applies an absolute five-second request deadline from connection acceptance;
  incoming activity does not refresh or extend that deadline;
- closes the full connection after the bounded response is flushed, including
  when a client keeps its write half open;
- limits requests to 128 bytes and responses to 4096 bytes;
- has no mutation operation;
- retains no request identifier, response body, raw memory, or secret value;
- writes no durable state and logs no request or response body;
- does not expose a TCP/HTTP or public MCP surface.

## Static Boundary

The ChatGPT R4 import-fence gate permits a listener only in the exact snapshot
UDS source file. It binds the single `net.createServer`/`server.listen` pair,
canonical parent checks, current-UID checks, and exact `0600` chmod/stat checks.
Moving, copying, widening, or making the listener network-addressable fails the
gate.

The six ChatGPT Edge tools, nine core MCP definitions, five Codex-default
tools, package dependencies, CI workflow, and durable-state policy remain
unchanged.

## Validation

Source validation covers:

- exact-key observation projection and disclosure drift rejection;
- valid owner-only UDS request/response and exact socket mode;
- malformed request and unsafe projection rejection;
- permissive and symlinked parent rejection;
- safe recovery from synthetic crash-left stale sockets at both final `0600`
  and pre-chmod modes, plus rejection of active, unsafe,
  parent/socket-identity-drifted, and probe-uncertain paths;
- concurrent stale-socket recovery serialization, with exactly one live
  rebound socket and no loser-side unlink;
- absolute request-deadline enforcement against four concurrent clients that
  continuously drip bytes, followed by successful slot reuse;
- full connection release after a valid response to a half-open client, so
  handled clients cannot exhaust the four connection slots;
- canonical main factory wiring and snapshot-server lifecycle, including
  fail-safe running-state reset and primary-error preservation when snapshot
  shutdown also fails;
- failure before secret-bound runtime loading when snapshot authority is
  missing or unsafe;
- static import-fence rejection for copied, public, or permission-weakened
  listeners;
- default-safe test-wrapper coverage so the observer suite runs under
  `npm test` and pull-request CI;
- existing outbound Relay behavior.

All UDS execution used synthetic temporary fixtures. No real runtime or private
configuration was touched.

## Remaining Boundary

Source wiring does not prove a real private exact-head runtime. Applying the
new path to real owner-only configuration and starting or probing the real
Relay remain separately authorized P3 actions. The existing
`r5_o_private_exact_head_runtime_unverified` blocker therefore remains open.

Rollback is source-only: revert the canonical factory, snapshot UDS, projection
validator, boundary metadata, tests, and this document. No memory or data
migration is required.
