# CM-21xx One-shot Evidence Archive

CM-2115 through CM-2130 generators, contracts, tests, and frozen artifacts are
historical evidence. Their source paths remain in place because frozen receipts
bind those paths and Git objects. They are not the active mechanism for proving
current runtime behavior and should not be copied into a new five-file evidence
bundle for each status change.

Ongoing read-only integrity verification uses one manifest-driven entrypoint:

```bash
npm run evidence:verify:frozen
```

The default manifest is the frozen CM-2130 final-main revalidation artifact.
The verifier checks canonical payload identity, baseline commit/tree, merge
ancestry, and frozen artifact blob/byte/SHA identities. It performs no writes,
provider calls, memory reads, authorization replay, status synchronization, or
readiness claim.

The historical generator scripts remain directly addressable by file path for
forensic replay in an isolated review. Their old npm aliases are intentionally
not part of the active command surface.
