# CM-2109 Isolated Failure-Recovery Execution Receipt

Result: `PASS`

```yaml
case_count: 3
passed_case_count: 3
total_claim_count: 2
total_write_invocation_count: 1
total_durable_writes: 1
total_retry_count: 0
total_rollback_count: 0
total_compensation_count: 0

failureRecoveryProofEligible: true
failureRecoveryProofPassed: false
phase8Completed: false
```

The three independently bound cases finished as:

```text
UNCLAIMED
CONSUMED_FAILED_PRE_COMMIT
CONSUMED_AMBIGUOUS_POST_COMMIT
```

The ambiguous case persisted exactly one 139-byte synthetic fixture with
SHA-256 `d9bde2e9…b2b2c0`, then lost the simulated acknowledgement and stopped.
It did not retry, infer success, rollback, or compensate.

Receipt payload SHA-256:

```text
07c1cf3ba9b609bd3249d195b2ba7a86c6e9d948e77de6b44751af975c99a882
```

No production provider, real memory, CM-2094 authorization, local fallback,
default MCP expansion, or readiness claim was used. The receipt remains an
evidence candidate until a separate Completion Audit application is accepted.
