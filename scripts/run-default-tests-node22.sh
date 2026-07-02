#!/usr/bin/env bash
set -euo pipefail

REQUIRED_NODE_MAJOR=22

node_major() {
  "$1" -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || printf '0\n'
}

is_compatible_node() {
  local candidate="$1"
  local major
  major="$(node_major "$candidate")"
  [ "${major:-0}" -ge "$REQUIRED_NODE_MAJOR" ]
}

select_node() {
  local current_node
  current_node="$(command -v node 2>/dev/null || true)"
  if [ -n "$current_node" ] && is_compatible_node "$current_node"; then
    printf '%s\n' "$current_node"
    return 0
  fi

  if [ -n "${HOME:-}" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
    set +u
    # shellcheck source=/dev/null
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
    set -u
    nvm use --silent "$REQUIRED_NODE_MAJOR" >/dev/null 2>&1 || true
    current_node="$(command -v node 2>/dev/null || true)"
    if [ -n "$current_node" ] && is_compatible_node "$current_node"; then
      printf '%s\n' "$current_node"
      return 0
    fi
  fi

  local candidate
  for candidate in "${HOME:-}/.nvm/versions/node/v${REQUIRED_NODE_MAJOR}"*/bin/node; do
    if [ -x "$candidate" ] && is_compatible_node "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

NODE_BIN="$(select_node || true)"
if [ -z "$NODE_BIN" ]; then
  printf 'codex-memory default tests require Node >=%s; no compatible node binary was found.\n' "$REQUIRED_NODE_MAJOR" >&2
  exit 1
fi

exec "$NODE_BIN" ./src/cli/run-default-tests.js "$@"
