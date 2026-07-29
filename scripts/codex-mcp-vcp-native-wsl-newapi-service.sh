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
canonical_mcp_port=7625
legacy_mcp_port=7605
legacy_shim_port=7615
newapi_dir="${NEWAPI_WSL_DIR:-/home/jenn/new-api-wsl}"

shim_pid_file="$run_dir/vcp-native-shim.pid"
mcp_pid_file="$run_dir/codex-memory-http.pid"
shim_log="$log_dir/vcp-native-shim.log"
mcp_log="$log_dir/codex-memory-http.log"

owner_uid="$(id -u)"
bash_executable="$(readlink -f -- "$(command -v bash)")"

owner_only_directory() {
  local directory="$1"
  [[ -d "$directory" && ! -L "$directory" ]] || return 1
  [[ "$(stat -c '%u' -- "$directory" 2>/dev/null || true)" == "$owner_uid" ]] ||
    return 1
  local mode
  mode="$(stat -c '%a' -- "$directory" 2>/dev/null || true)"
  [[ "$mode" =~ ^[0-7]{3,4}$ ]] || return 1
  (( (8#$mode & 077) == 0 ))
}

read_managed_pid() {
  local pid_file="$1"
  owner_only_directory "$(dirname "$pid_file")" || return 1
  [[ -f "$pid_file" && ! -L "$pid_file" ]] || return 1
  [[ "$(stat -c '%u' -- "$pid_file" 2>/dev/null || true)" == "$owner_uid" ]] ||
    return 1
  local pid
  pid="$(<"$pid_file")"
  [[ "$pid" =~ ^[1-9][0-9]{0,9}$ ]] || return 1
  ((pid > 1)) || return 1
  printf '%s' "$pid"
}

managed_loop_identity_matches() {
  local pid="$1"
  local service_name="$2"
  [[ -d "/proc/$pid" ]] || return 1
  [[ "$(stat -c '%u' -- "/proc/$pid" 2>/dev/null || true)" == "$owner_uid" ]] ||
    return 1
  local process_executable
  process_executable="$(
    readlink -f -- "/proc/$pid/exe" 2>/dev/null || true
  )"
  [[ "$process_executable" == "$bash_executable" ]] || return 1
  [[ "$(readlink -- "/proc/$pid/cwd" 2>/dev/null || true)" == "$repo_root" ]] ||
    return 1
  local pgid
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
  [[ "$pgid" == "$pid" ]] || return 1
  local -a command_args=()
  mapfile -d '' -t command_args < "/proc/$pid/cmdline" || return 1
  [[ "${#command_args[@]}" -eq 5 ]] || return 1
  [[ "${command_args[0]##*/}" == "bash" ]] || return 1
  [[ "${command_args[1]}" == "$repo_root/scripts/run-managed-loop.sh" ]] ||
    return 1
  [[ "${command_args[2]}" == "$service_name" ]] || return 1
  if [[ "$service_name" == "codex-memory-http" ]]; then
    [[ "${command_args[3]}" == "node" &&
       "${command_args[4]}" == "./src/http-index.js" ]]
    return
  fi
  [[ "$service_name" == "vcp-native-shim" &&
     "${command_args[3]}" == "bash" &&
     "${command_args[4]}" == "$repo_root/scripts/start-vcp-native-shim-wsl-newapi.sh" ]]
}

is_running() {
  local pid_file="$1"
  local service_name="$2"
  local pid
  pid="$(read_managed_pid "$pid_file")" || return 1
  kill -0 "$pid" >/dev/null 2>&1 || return 1
  managed_loop_identity_matches "$pid" "$service_name"
}

pid_value() {
  local pid_file="$1"
  read_managed_pid "$pid_file" 2>/dev/null || true
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

normalize_port() {
  local value="$1"
  if [[ ! "$value" =~ ^[0-9]{1,5}$ ]]; then
    return 1
  fi
  local normalized=$((10#$value))
  if ((normalized < 1 || normalized > 65535)); then
    return 1
  fi
  printf '%s' "$normalized"
}

require_compatibility_start_topology() {
  local normalized_mcp_port
  local normalized_shim_port
  normalized_mcp_port="$(normalize_port "$mcp_port")" || {
    echo "Refusing legacy start: compatibility topology is invalid." >&2
    return 2
  }
  normalized_shim_port="$(normalize_port "$shim_port")" || {
    echo "Refusing legacy start: compatibility topology is invalid." >&2
    return 2
  }
  if [[ "$mcp_host" != "127.0.0.1" ||
        "$shim_host" != "127.0.0.1" ||
        "$mcp_port" != "7605" ||
        "$shim_port" != "7615" ||
        "$normalized_mcp_port" != "$legacy_mcp_port" ||
        "$normalized_shim_port" != "$legacy_shim_port" ||
        "$normalized_mcp_port" == "$canonical_mcp_port" ||
        "$normalized_shim_port" == "$canonical_mcp_port" ]]; then
    echo "Refusing legacy start: only the loopback 7605/7615 compatibility topology is allowed." >&2
    return 2
  fi
}

start_service() {
  ensure_dirs
  ensure_token
  ensure_newapi

  if ! is_running "$shim_pid_file" "vcp-native-shim"; then
    local shim_pid
    shim_pid="$(read_managed_pid "$shim_pid_file" 2>/dev/null || true)"
    if [[ ( -e "$shim_pid_file" || -L "$shim_pid_file" ) &&
          -z "$shim_pid" ]]; then
      echo "Refusing to start shim: PID file identity is invalid." >&2
      exit 2
    fi
    if [[ -n "$shim_pid" ]] && kill -0 "$shim_pid" >/dev/null 2>&1; then
      echo "Refusing to start shim: PID file does not identify the legacy supervisor." >&2
      exit 2
    fi
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

  if ! is_running "$mcp_pid_file" "codex-memory-http"; then
    local mcp_pid
    mcp_pid="$(read_managed_pid "$mcp_pid_file" 2>/dev/null || true)"
    if [[ ( -e "$mcp_pid_file" || -L "$mcp_pid_file" ) &&
          -z "$mcp_pid" ]]; then
      echo "Refusing to start Codex MCP: PID file identity is invalid." >&2
      exit 2
    fi
    if [[ -n "$mcp_pid" ]] && kill -0 "$mcp_pid" >/dev/null 2>&1; then
      echo "Refusing to start Codex MCP: PID file does not identify the legacy supervisor." >&2
      exit 2
    fi
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
      CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_TOKEN="$CODEX_MEMORY_HTTP_TOKEN" \
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
  local service_name="$3"
  if [[ ! -e "$pid_file" && ! -L "$pid_file" ]]; then
    return 0
  fi
  local pid
  pid="$(read_managed_pid "$pid_file")" || {
    echo "Refusing to stop $label: PID file identity is invalid." >&2
    return 2
  }
  local pid_file_identity
  pid_file_identity="$(stat -c '%d:%i:%u:%f' -- "$pid_file" 2>/dev/null || true)"
  [[ -n "$pid_file_identity" ]] || {
    echo "Refusing to stop $label: PID file identity is invalid." >&2
    return 2
  }
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    rm -- "$pid_file"
    return 0
  fi
  if ! managed_loop_identity_matches "$pid" "$service_name"; then
    echo "Refusing to stop $label: process identity is not the legacy supervisor." >&2
    return 2
  fi
  local process_start_ticks
  process_start_ticks="$(awk '{print $22}' "/proc/$pid/stat" 2>/dev/null || true)"
  [[ "$process_start_ticks" =~ ^[0-9]+$ ]] || {
    echo "Refusing to stop $label: process start identity is unavailable." >&2
    return 2
  }
  local current_start_ticks
  current_start_ticks="$(
    awk '{print $22}' "/proc/$pid/stat" 2>/dev/null || true
  )"
  local current_pid_file_identity
  current_pid_file_identity="$(
    stat -c '%d:%i:%u:%f' -- "$pid_file" 2>/dev/null || true
  )"
  if ! managed_loop_identity_matches "$pid" "$service_name" ||
     [[ "$current_start_ticks" != "$process_start_ticks" ]] ||
     [[ "$current_pid_file_identity" != "$pid_file_identity" ]]; then
    echo "Refusing to stop $label: process identity changed." >&2
    return 2
  fi
  kill -TERM -- "-$pid" >/dev/null 2>&1 || kill "$pid" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      local final_pid_file_identity
      final_pid_file_identity="$(
        stat -c '%d:%i:%u:%f' -- "$pid_file" 2>/dev/null || true
      )"
      if [[ "$(read_managed_pid "$pid_file" 2>/dev/null || true)" == "$pid" &&
            "$final_pid_file_identity" == "$pid_file_identity" ]]; then
        rm -- "$pid_file"
      fi
      return 0
    fi
    sleep 0.2
  done
  echo "$label did not stop after SIGTERM." >&2
  return 1
}

stop_service() {
  stop_one "$mcp_pid_file" "Codex MCP" "codex-memory-http"
  stop_one "$shim_pid_file" "VCP native shim" "vcp-native-shim"
  status_service
}

status_service() {
  local token_present=false
  local shim_running=false
  local mcp_running=false
  if [[ -n "${CODEX_MEMORY_HTTP_TOKEN:-}" || -f "$token_file" ]]; then
    token_present=true
  fi
  if is_running "$shim_pid_file" "vcp-native-shim"; then
    shim_running=true
  fi
  if is_running "$mcp_pid_file" "codex-memory-http"; then
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
    require_compatibility_start_topology
    start_service
    ;;
  stop)
    stop_service
    ;;
  restart)
    require_compatibility_start_topology
    stop_service >/dev/null
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
