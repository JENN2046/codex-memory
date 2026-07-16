# CM-2109 Exact Isolated Failure-Recovery Execution Decision

This self-governed decision authorizes one execution of the exact frozen
CM-2109 packet against the Git-common-dir-derived, synthetic-only harness root.

The only permitted evidence cases are:

1. failure before authorization claim;
2. failure after claim and before write invocation;
3. lost acknowledgement after one isolated synthetic durable commit.

The aggregate maximum is two claims, one synthetic native-like invocation, one
durable fixture, and zero retries, rollback, or compensation operations. The
decision does not authorize provider calls, real-memory access, reuse of any
CM-2094 authorization or marker, default MCP expansion, or readiness claims.

This decision is consumed by one harness execution. It does not set
`failureRecoveryProofPassed` or complete Phase 8 by itself; a frozen execution
receipt and separate Completion Audit application are still required.
