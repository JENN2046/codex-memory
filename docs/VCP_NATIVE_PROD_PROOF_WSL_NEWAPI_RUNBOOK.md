# VCP Native Production Proof Runbook for WSL-local NewAPI

This runbook captures the production proof path where `codex-memory` runs in
WSL and NewAPI also runs in WSL.

## Preconditions

- VCPToolBox is available at `/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox`.
- WSL-local NewAPI is reachable on `http://127.0.0.1:3000`.
- `VCPToolBox/config.env` contains provider keys for:
  - `API_Key`
  - `WhitelistEmbeddingModel`
  - `VECTORDB_DIMENSION`
- The WSL-local NewAPI database has been copied from the Windows desktop app
  data directory into `/home/jenn/new-api-wsl/data/new-api.db`.

The helper defaults to:

```bash
API_URL=http://127.0.0.1:3000
```

No VCPToolBox native source code is modified.

## WSL-local NewAPI Service

The local service lives at `/home/jenn/new-api-wsl` and is managed by Docker
Compose:

```bash
cd /home/jenn/new-api-wsl
docker compose up -d
docker compose logs --tail 80
```

## Production Read Proof

```bash
npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

Expected accepted signals:

- `accepted=true`
- `productGoalProgress.productionProviderLiveProofCovered=true`
- `productGoalProgress.readProofCovered=true`
- `disclosure.endpointDisclosed=false`
- `disclosure.tokenMaterialDisclosed=false`
- `readinessClaimed=false`

## Operator-Approved Real-Root Write Proof

This mode writes governed proof markers into the real VCPToolBox `dailynote`
root. It requires an explicit operator approval environment variable.

```bash
APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF=1 \
  npm run --silent vcp-native:prod-proof:wsl-newapi -- real-root-write
```

Expected accepted signals:

- `accepted=true`
- `productGoalProgress.productionProviderLiveProofCovered=true`
- `productGoalProgress.readProofCovered=true`
- `productGoalProgress.writeSuiteProofCovered=true`
- `productGoalProgress.operatorApprovedRealRootWriteProofCovered=true`
- `productGoalProgress.remainingWork=[]`
- `operatorApprovedRealRootWriteProofGate.bridgeMayAutoApproveRealRootWriteProof=false`
- `operatorApprovedRealRootWriteProofGate.bridgeMayInferApprovalFromPath=false`
- `operatorApprovedRealRootWriteProofGate.bridgeMayUseTemporaryRootForRealRootProof=false`

Without `APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF=1`, this helper refuses to run
the real-root write proof before invoking the proof CLI.

## Codex MCP Runtime Target Profile

After the proof path is accepted, the same target can be exposed to Codex MCP as
an optional runtime profile.

Start the managed WSL-local service pair:

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
```

This starts:

- VCP native shim on `http://127.0.0.1:7615/mcp/vcp-native`
- Codex MCP on `http://127.0.0.1:7625/mcp/codex-memory`

It stores local pids, logs, and the HTTP bearer token under
`/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp`.

Check or stop it with:

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
npm run --silent vcp-native:codex-mcp:wsl-newapi:stop
```

The managed service keeps native write delegation off by default.

Start the stable VCP native shim:

```bash
npm run --silent vcp-native:shim:wsl-newapi
```

Run Codex MCP with the profile enabled:

```bash
CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE=wsl-newapi-prod npm start
```

The profile installs this low-disclosure runtime target shape:

- public target reference: `operator-vcp-toolbox-service-ref`
- private HTTP MCP endpoint: `http://127.0.0.1:7615/mcp/vcp-native`
- bridge gate mode: `observe`
- read delegation mode: `primary_with_local_fallback`
- write delegation mode: `off`

To opt into governed native writes, keep the profile enabled and explicitly set:

```bash
CODEX_MEMORY_GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATION_MODE=primary
```

Write calls still require exact approval and rollback posture at call time.

## Overrides

The helper accepts these environment overrides:

- `API_URL`: explicit provider URL.
- `WSL_NEWAPI_HOST`: explicit NewAPI host/IP. Defaults to `127.0.0.1`.
  If set without a scheme, the helper expands it to `http://<host>:3000`.
- `VCP_ROOT`: VCPToolBox root.
- `KB_ROOT`: real knowledge-base root for write proof.
- `KB_STORE`: isolated derived store path.
- `EVIDENCE_OUTPUT`: evidence artifact path.
- `QUERY`: proof query text.
- `TIMEOUT_MS`: proof timeout.
- `SHIM_START_TIMEOUT_MS`: shim startup timeout.
