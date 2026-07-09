#!/usr/bin/env bash
set -euo pipefail

label="${1:-managed-process}"
shift || true

if [[ "$#" -eq 0 ]]; then
  echo "Usage: $0 <label> <command> [args...]" >&2
  exit 2
fi

restart_delay="${SUPERVISOR_RESTART_DELAY_SECONDS:-2}"
child_pid=""

terminate() {
  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" >/dev/null 2>&1; then
    kill "$child_pid" >/dev/null 2>&1 || true
    wait "$child_pid" >/dev/null 2>&1 || true
  fi
  exit 0
}

trap terminate INT TERM

while true; do
  printf '[%s] starting %s\n' "$(date -Is)" "$label"
  "$@" &
  child_pid="$!"
  set +e
  wait "$child_pid"
  exit_code="$?"
  set -e
  child_pid=""
  printf '[%s] %s exited with code %s; restarting in %ss\n' \
    "$(date -Is)" "$label" "$exit_code" "$restart_delay"
  sleep "$restart_delay"
done
