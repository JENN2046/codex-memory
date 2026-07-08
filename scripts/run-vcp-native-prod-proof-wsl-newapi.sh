#!/usr/bin/env bash
set -euo pipefail

mode="${1:-read}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vcp_root="${VCP_ROOT:-/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox}"
kb_root="${KB_ROOT:-$vcp_root/dailynote}"

newapi_host="${WSL_NEWAPI_HOST:-127.0.0.1}"
if [[ "$newapi_host" != http://* && "$newapi_host" != https://* ]]; then
  newapi_host="http://$newapi_host:3000"
fi

export API_URL="${API_URL:-$newapi_host}"

common_args=(
  "$repo_root/src/cli/governed-vcp-native-live-read-proof.js"
  --json
  --require-production-provider
  --use-vcp-config-env
  --vcp-root "$vcp_root"
  --shim-start-timeout-ms "${SHIM_START_TIMEOUT_MS:-10000}"
  --timeout-ms "${TIMEOUT_MS:-180000}"
  --project-id "${PROJECT_ID:-codex-memory}"
  --workspace-id "${WORKSPACE_ID:-workspace-alpha}"
  --scope-id "${SCOPE_ID:-scope-alpha}"
  --visibility "${VISIBILITY:-private}"
)

case "$mode" in
  read)
    exec node "${common_args[@]}" \
      --include-read-suite \
      --kb-store "${KB_STORE:-/tmp/codex-memory-vcp-native-prod-read-store}" \
      --evidence-output "${EVIDENCE_OUTPUT:-/tmp/codex-memory-vcp-native-prod-read-evidence.json}" \
      --query "${QUERY:-codex memory governed native production provider proof}"
    ;;
  real-root-write)
    if [[ "${APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF:-}" != "1" ]]; then
      echo "Refusing real-root write proof: set APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF=1." >&2
      exit 2
    fi
    exec node "${common_args[@]}" \
      --include-read-suite \
      --include-write-suite \
      --approve-real-root-write-proof \
      --require-operator-approved-real-root-write-proof \
      --kb-root "$kb_root" \
      --kb-store "${KB_STORE:-/tmp/codex-memory-vcp-native-prod-real-root-write-store}" \
      --evidence-output "${EVIDENCE_OUTPUT:-/tmp/codex-memory-vcp-native-prod-real-root-write-evidence.json}" \
      --query "${QUERY:-codex memory governed native production provider real root write proof}"
    ;;
  *)
    echo "Usage: $0 [read|real-root-write]" >&2
    exit 2
    ;;
esac
