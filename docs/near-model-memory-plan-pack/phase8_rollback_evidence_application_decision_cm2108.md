# CM-2108 Rollback Evidence Application Decision

This is a self-governed, repository-reality decision under Jenn's delegated
prohibited-first authority. It authorizes exactly one documentation/governance
application of the accepted CM-2107 rollback receipt.

The only completion-evidence transition authorized by this decision is:

```yaml
rollbackDrillPassed: false -> true
failureRecoveryProofPassed: false
phase8Completed: false
fullPlanPackCompleted: false
readinessClaimed: false
```

The source receipt is the exact JSON blob at commit
`32eb63b891647d1794d51e025883bbc12b521db1`, with raw SHA-256
`86701dd223ef054406df846faffb958708795465205b8ba84ee2cbde8abec609`
and canonical payload SHA-256
`928da067bed3fc6e840fd903e8012c248753a82b9fdb9a4b6d259a68b4fbe95d`.

This decision authorizes no native read or write, no new tombstone or verify,
no retry, no rollback/compensation action, no remote action, and no readiness
claim. It must be frozen in Git before the application contract may accept it.
