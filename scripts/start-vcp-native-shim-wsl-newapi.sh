#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vcp_root="${VCP_ROOT:-/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox}"
kb_root="${KB_ROOT:-$vcp_root/dailynote}"
kb_store="${KB_STORE:-/tmp/codex-memory-vcp-native-prod-shim-store}"
host="${SHIM_HOST:-127.0.0.1}"
port="${SHIM_PORT:-7615}"
config_env="${VCP_CONFIG_ENV:-$vcp_root/config.env}"

read_config_value() {
  local key="$1"
  if [[ ! -f "$config_env" ]]; then
    return 0
  fi
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$config_env"
}

export API_Key="${API_Key:-$(read_config_value API_Key)}"
export WhitelistEmbeddingModel="${WhitelistEmbeddingModel:-$(read_config_value WhitelistEmbeddingModel)}"
export VECTORDB_DIMENSION="${VECTORDB_DIMENSION:-$(read_config_value VECTORDB_DIMENSION)}"

newapi_host="${WSL_NEWAPI_HOST:-127.0.0.1}"
if [[ "$newapi_host" != http://* && "$newapi_host" != https://* ]]; then
  newapi_host="http://$newapi_host:3000"
fi

export API_URL="${API_URL:-$newapi_host}"

args=(
  "$repo_root/src/cli/vcp-toolbox-native-mcp-shim.js"
  --host "$host"
  --port "$port"
  --vcp-root "$vcp_root"
  --kb-store "$kb_store"
)

if [[ "${ENABLE_REAL_ROOT_WRITE:-}" == "1" ]]; then
  args+=(--kb-root "$kb_root" --enable-write)
elif [[ -n "${KB_ROOT:-}" ]]; then
  args+=(--kb-root "$kb_root")
fi

exec node "${args[@]}"
