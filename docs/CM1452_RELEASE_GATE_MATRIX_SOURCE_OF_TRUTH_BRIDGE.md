# CM-1452 Release Gate Matrix Source-of-Truth Bridge

Date: 2026-06-04

Status: `COMPLETED_VALIDATED_SOURCE_TESTS_NO_PACKAGE_SCRIPT_CHANGE`

## Scope

CM-1452 adds a static source-of-truth bridge between `docs/CM1448_RELEASE_TEST_GATE_MATRIX.md` and `src/cli/run-default-tests.js`.

Changed test:

- `tests/release-test-gate-matrix-contract.test.js`

## Contract

The test confirms:

- the CM-1448 matrix names the default-safe excluded classes: provider, daemon, self-referential, and fixture-drift
- `resolveExcluded()` includes the files from each exclusion list
- `package.json` still does not define `test:release-candidate`, `test:parity`, or `test:migration`
- the matrix says default tests are not release readiness

## Validation

Passed:

- `node --check tests\release-test-gate-matrix-contract.test.js`
- `node --test tests\mcp-http.test.js tests\audit-memory-readonly-tool-draft.test.js tests\release-test-gate-matrix-contract.test.js` passed `33/33`

## Boundary

CM-1452 did not change `package.json`, dependency manifests, CI, package scripts, runtime behavior, provider/API behavior, memory tools, public MCP tools, remote state, readiness status, or `RC_READY` status.
