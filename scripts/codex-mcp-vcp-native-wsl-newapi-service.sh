#!/usr/bin/env bash
set -euo pipefail

command_name="${1:-status}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

runtime_dir="${CODEX_MEMORY_VCP_NATIVE_SERVICE_DIR:-/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp}"
run_dir="$runtime_dir/run"
log_dir="$runtime_dir/logs"
token_file="${CODEX_MEMORY_HTTP_TOKEN_FILE:-$runtime_dir/http-token}"

shim_host="${SHIM_HOST:-127.0.0.1}"
shim_port="${SHIM_PORT:-7615}"
mcp_host="${CODEX_MEMORY_HTTP_HOST:-127.0.0.1}"
mcp_port="${CODEX_MEMORY_HTTP_PORT:-7625}"
newapi_dir="${NEWAPI_WSL_DIR:-/home/jenn/new-api-wsl}"

shim_pid_file="$run_dir/vcp-native-shim.pid"
mcp_pid_file="$run_dir/codex-memory-http.pid"
shim_log="$log_dir/vcp-native-shim.log"
mcp_log="$log_dir/codex-memory-http.log"

is_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid" ]] || return 1
  kill -0 "$pid" >/dev/null 2>&1
}

pid_value() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    cat "$pid_file" 2>/dev/null || true
  fi
}

port_listening() {
  local port="$1"
  ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$port$"
}

wait_for_port() {
  local port="$1"
  local label="$2"
  local attempts="${3:-60}"
  for _ in $(seq 1 "$attempts"); do
    if port_listening "$port"; then
      return 0
    fi
    sleep 0.5
  done
  echo "$label did not listen on port $port in time" >&2
  return 1
}

ensure_dirs() {
  mkdir -p "$run_dir" "$log_dir" "$runtime_dir/data"
  chmod 700 "$runtime_dir" "$run_dir" "$log_dir" "$runtime_dir/data"
}

ensure_token() {
  if [[ -n "${CODEX_MEMORY_HTTP_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ ! -f "$token_file" ]]; then
    node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" > "$token_file"
    chmod 600 "$token_file"
  fi
  export CODEX_MEMORY_HTTP_TOKEN
  CODEX_MEMORY_HTTP_TOKEN="$(cat "$token_file")"
}

ensure_newapi() {
  if port_listening 3000; then
    return 0
  fi
  if [[ -f "$newapi_dir/docker-compose.yml" ]] && command -v docker >/dev/null 2>&1; then
    (cd "$newapi_dir" && docker compose up -d >/dev/null)
    wait_for_port 3000 "WSL-local NewAPI" 80
  fi
}

start_service() {
  ensure_dirs
  ensure_token
  ensure_newapi

  if ! is_running "$shim_pid_file"; then
    if port_listening "$shim_port"; then
      echo "Refusing to start shim: port $shim_port is already in use by an unmanaged process." >&2
      exit 2
    fi
    cd "$repo_root"
    setsid env \
      SHIM_HOST="$shim_host" \
      SHIM_PORT="$shim_port" \
      CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN" \
      WSL_NEWAPI_HOST="${WSL_NEWAPI_HOST:-127.0.0.1}" \
      SUPERVISOR_RESTART_DELAY_SECONDS=2 \
      bash "$repo_root/scripts/run-managed-loop.sh" \
      vcp-native-shim \
      bash "$repo_root/scripts/start-vcp-native-shim-wsl-newapi.sh" \
      > "$shim_log" 2>&1 < /dev/null &
    echo $! > "$shim_pid_file"
    wait_for_port "$shim_port" "VCP native shim"
  fi

  if ! is_running "$mcp_pid_file"; then
    if port_listening "$mcp_port"; then
      echo "Refusing to start Codex MCP: port $mcp_port is already in use by an unmanaged process." >&2
      exit 2
    fi
    cd "$repo_root"
    setsid env \
      CODEX_MEMORY_HTTP_HOST="$mcp_host" \
      CODEX_MEMORY_HTTP_PORT="$mcp_port" \
      CODEX_MEMORY_HTTP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN" \
      CODEX_MEMORY_DATA_DIR="$runtime_dir/data" \
      CODEX_MEMORY_LOGS_DIR="$log_dir" \
      CODEX_MEMORY_VCP_NATIVE_RUNTIME_PROFILE=wsl-newapi-prod \
      CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT="http://$shim_host:$shim_port/mcp/vcp-native" \
      CODEX_MEMORY_PROJECT_ID="${CODEX_MEMORY_PROJECT_ID:-codex-memory}" \
      CODEX_MEMORY_WORKSPACE_ID="${CODEX_MEMORY_WORKSPACE_ID:-workspace-alpha}" \
      CODEX_MEMORY_SCOPE_ID="${CODEX_MEMORY_SCOPE_ID:-scope-alpha}" \
      CODEX_MEMORY_CLIENT_ID="${CODEX_MEMORY_CLIENT_ID:-codex}" \
      CODEX_MEMORY_VISIBILITY="${CODEX_MEMORY_VISIBILITY:-private}" \
      SUPERVISOR_RESTART_DELAY_SECONDS=2 \
      bash "$repo_root/scripts/run-managed-loop.sh" \
      codex-memory-http \
      node ./src/http-index.js \
      > "$mcp_log" 2>&1 < /dev/null &
    echo $! > "$mcp_pid_file"
    wait_for_port "$mcp_port" "Codex MCP"
  fi

  status_service
}

stop_one() {
  local pid_file="$1"
  local label="$2"
  if ! is_running "$pid_file"; then
    rm -f "$pid_file"
    return 0
  fi
  local pid
  pid="$(pid_value "$pid_file")"
  kill -TERM -- "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$pid_file"
      return 0
    fi
    sleep 0.2
  done
  echo "$label did not stop after SIGTERM." >&2
  return 1
}

stop_service() {
  stop_one "$mcp_pid_file" "Codex MCP"
  stop_one "$shim_pid_file" "VCP native shim"
  status_service
}

status_service() {
  local token_present=false
  local shim_running=false
  local mcp_running=false
  if [[ -n "${CODEX_MEMORY_HTTP_TOKEN:-}" || -f "$token_file" ]]; then
    token_present=true
  fi
  if is_running "$shim_pid_file"; then
    shim_running=true
  fi
  if is_running "$mcp_pid_file"; then
    mcp_running=true
  fi
  node - <<NODE
const out = {
  service: 'codex-memory-vcp-native-wsl-newapi',
  runtimeDir: '$runtime_dir',
  tokenFile: '$token_file',
  tokenPresent: $token_present,
  tokenDisclosed: false,
  newApi: { endpoint: 'http://127.0.0.1:3000', endpointDisclosed: true },
  shim: {
    endpoint: 'http://$shim_host:$shim_port/mcp/vcp-native',
    pid: '$(pid_value "$shim_pid_file")' || null,
    running: $shim_running,
    log: '$shim_log'
  },
  codexMcp: {
    endpoint: 'http://$mcp_host:$mcp_port/mcp/codex-memory',
    pid: '$(pid_value "$mcp_pid_file")' || null,
    running: $mcp_running,
    runtimeProfile: 'wsl-newapi-prod',
    writeDelegationMode: 'off',
    log: '$mcp_log'
  }
};
console.log(JSON.stringify(out, null, 2));
NODE
}

case "$command_name" in
  start)
    start_service
    ;;
  stop)
    stop_service
    ;;
  restart)
    stop_service >/dev/null || true
    start_service
    ;;
  status)
    status_service
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status]" >&2
    exit 2
    ;;
esac
