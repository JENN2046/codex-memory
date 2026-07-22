# ChatGPT Web R5-H Private ChatGPT Dogfood Closeout

Architecture reference: `codex-memory-chatgpt-web-r4-v1`

Final verdict: `R5_H_20_SESSION_OBSERVATION_COMPLETE_PLAN_MATRIX_INCOMPLETE`

## Result

The private single-operator observation run completed 20 fresh ChatGPT
conversations. It demonstrated that the model can select the governed
resolve-plus-one-read workflow for meaningful project tasks and can also
abstain or ask for missing scope. It did not demonstrate deterministic
automatic tool selection or universal terminal stop. It also did not satisfy
the frozen R5-H task distribution: the plan required 12 memory-relevant and 8
negative sessions, while the observed run contained 10 memory-relevant and 10
negative sessions. The run is evidence, but it is not accepted as completion
of the planned R5-H matrix.

The observed task mix and low-disclosure outcomes were:

| Observation | Count |
|---|---:|
| Total sessions | 20 |
| Memory-relevant sessions | 10 |
| Memory-irrelevant sessions | 4 |
| Scope-missing sessions | 6 |
| Planned memory-relevant sessions | 12 |
| Planned negative sessions | 8 |
| Planned matrix satisfied | no |
| Expected read-tool matches | 8 |
| Negative abstentions | 7 |
| Sessions with a post-terminal retry | 1 |
| Post-terminal tool attempts | 2 |
| Provider calls | 5 |
| Native invocations | 5 |

Search, overview, audit, and task-context choices were observed. Bounded
project search returned a low-disclosure result in successful sessions; no raw
memory, request body, response body, diary name, secret, token, or private
binding value is included in this report.

## Safety verdict

The safety boundary passed:

```yaml
default_closed: true
one_read_enforced: true
primary_memory_writes: 0
source_partition_mutations: 0
local_fallbacks: 0
unrestricted_native_searches: 0
derived_runtime_lifecycle_events: 6
derived_runtime_policy_violations: 0
shutdown_drain: pass
```

The six derived-runtime lifecycle events were authorized isolated runtime
maintenance under the R5-D contract. They are not primary-memory writes. Five
other durable mutations were limited to governance receipt/audit accounting.

The one-read lease remained authoritative when the model tried to continue:
two post-terminal attempts were rejected without increasing provider/native
calls. No cross-project, client-private, legacy, ambiguous, or unregistered
result was accepted, and no unrestricted/global native search occurred.

## Actionable findings

1. Terminal stop is not universal. Guidance reduces extra calls, but the
   one-read lease remains the required enforcement boundary.
2. Model narration is not runtime evidence. Public conclusions must be based
   on the receipt chain and owner-only observer, not statements such as
   "timeout" or an asserted retry count.
3. Resolution failures can trigger retries or alias guessing. Error projection
   should make terminal/fail-closed states easier for the model to distinguish
   without exposing private identifiers.
4. `task_start_context` cannot currently succeed for the ChatGPT principal
   because the existing contract requires a current client-private partition.
   Whether to provision one or define a project/workspace-only ChatGPT profile
   is a separate governance decision.
5. Exact-head deployment verification must bind the actual private harness
   state. A stale private wrapper path was corrected during the window, the
   exact merged source was redeployed, and the final rollback was independently
   verified.

## Closeout and non-claims

Verification-complete kill was issued. Governance, outbound Relay, and the
isolated VCP shim were stopped after shutdown drain. The retained
private-development Edge was restored and verified in `zero_memory` mode with
HTTPS health, protected-resource metadata, and anonymous rejection preserved.

The immutable owner-only artifact remains outside Git and binds exact source,
private mapping/registry/runtime identities, all 20 observations, lifecycle
accounting, and rollback evidence. This public document intentionally contains
only low-disclosure aggregates.

R5-H does not claim automatic-first-task guarantees, production readiness,
release readiness, deploy readiness, cutover readiness, continuous activation,
or general model reliability.

## Next gate

Before R5-H can be accepted, choose one explicit route:

- authorize a corrective positive-session supplement after deriving the exact
  missing per-tool targets from owner-control evidence; or
- amend the frozen task matrix, explain why the changed distribution is valid,
  and subject the amended contract to review.

Neither route is inferred from this closeout. R5-I behavior and error-semantics
hardening can still proceed independently:

- make receipt-backed failure categories clearer to the model;
- reduce alias guessing and redundant resolution attempts;
- preserve terminal-stop enforcement in runtime, not prompt promises;
- make an explicit product decision for ChatGPT task-start visibility before
  provisioning any new private partition or changing the mapping contract.

Source-only hardening requires no immediate runtime activation. Any corrective
live window, provider use, memory access, new partition, production action,
release, deploy, cutover, or readiness claim remains separately bounded.
