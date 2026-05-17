# P35 Governed Memory Spine Policy Gate Plan

Status: `P35_POLICY_GATE_PLANNED_BLOCKED_FOR_RUNTIME`

Date: 2026-05-17

## Objective

Define the next safe local slice after P34: a fixture-first policy gate that can explain whether governed memory actions are ready for planning, still blocked, or require A5 approval.

This is planning only. It does not implement a runtime gate.

## Inputs

The future policy gate may cite committed evidence from:

- P31 lifecycle contract evidence
- P32 approval-packet evidence
- P33 audit-evidence evidence
- P34 review-surface evidence
- ValidationAggregator static report-shape evidence
- current public MCP tool freeze
- current schema/version runtime enforcement blocker
- current final RC matrix blocker

## Safe Output Shape

A future fixture should be able to report:

- `decision`: `NOT_READY_BLOCKED`
- `sourceMode`: `fixture_only`
- `policyGateImplemented`: `false`
- `runtimeIntegrated`: `false`
- `governedActionApproved`: `false`
- `durableMemoryTouched`: `false`
- `durableAuditWritten`: `false`
- `publicMcpExpanded`: `false`
- `realMemoryScanned`: `false`
- `realDbReviewed`: `false`
- `providerCalled`: `false`
- `requiredApprovals`: blocked A5 action list
- `requiredRuntimeWork`: schema/version runtime enforcement, full ValidationAggregator, final RC matrix runner, runtime governance review

## Required Fail-Closed Cases

A future fixture/helper must fail closed when input claims:

- runtime policy gate has executed
- governed action is approved
- durable memory or durable audit was written
- public MCP tools expanded
- real memory was scanned
- real DB was reviewed
- provider/model was called
- v1.0 RC is ready

## Non-Goals

P35 does not:

- implement runtime policy enforcement
- add public MCP tools or schema fields
- approve governed actions
- execute `governance:report`
- scan real memory
- review a real DB
- write durable memory or audit records
- apply migrations/import-export
- create backups or restore data
- call providers or models
- start services or install watchdog/startup tasks
- push, tag, release, or deploy

## Next Safe Slice

`P35.1-governed-memory-policy-gate-fixture-contract`

The next safe task may add a synthetic fixture and focused test for this policy gate shape. It must stay fixture-only and preserve `NOT_READY_BLOCKED`.
