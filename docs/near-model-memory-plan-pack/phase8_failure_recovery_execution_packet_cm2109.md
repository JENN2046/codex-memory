# CM-2109 Isolated Failure-Recovery Execution Packet

This packet freezes three independent synthetic fault cases and does not
authorize execution by itself.

```text
pre-claim failure
pre-commit failure after claim
ambiguous post-commit acknowledgement loss
```

The runtime is commit `023a7769a900a4c4f3df880d04672d34c3a78853`.
The harness root is derived from Git common-dir governance state; callers and
environment variables cannot supply a path. The maximum aggregate effects are
two claims, one isolated synthetic write invocation, and one 139-byte durable
fixture. Retry, rollback, compensation, provider calls, real-memory access,
CM-2094 authorization reuse, default MCP expansion, and readiness claims are
all forbidden.

An exact, separately frozen decision is required before execution.
