#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -t 0 || ! -t 1 ]]; then
  printf '%s\n' '此启动器需要在交互式终端中运行。' >&2
  exit 2
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' '未找到 npm；没有执行任何 mapping-package 操作。' >&2
  read -r -p '按 Enter 关闭...'
  exit 2
fi

run_mapping_command() {
  local action="$1"
  shift
  local result
  local status

  set +e
  result="$(cd "$repo_root" && npm run --silent owner-runtime:mapping-package -- "$action" "$@" --json 2>&1)"
  status=$?
  set -e

  printf '%s\n' "$result"
  if [[ "$status" -eq 0 ]]; then
    printf '%s\n' '未启动 runtime，也未调用 provider 或 memory 工具。'
  else
    printf '%s\n' '操作被阻止或安全失败；请按 receipt 判断是否需要 reconciliation。'
  fi
  return "$status"
}

read_plan_inputs() {
  read -r -p '已批准 owner-only mapping JSON 的绝对路径：' mapping_source
  read -r -p '既有完整 owner-only private root 的绝对路径：' private_root
  read -r -p '新 mapping package 名称：' package_name
  [[ -n "$mapping_source" && -n "$private_root" && -n "$package_name" ]]
}

printf '%s\n' 'Codex Memory — owner-only mapping package'
printf '%s\n' '1) Plan（只读验证，不写配置）'
printf '%s\n' '2) Apply（写入新的 private mapping package）'
printf '%s\n' '3) Check（只读复核既有 package）'
printf '%s\n' '直接按 Enter 取消'
read -r -p '请选择：' choice
exit_status=0

case "$choice" in
  1)
    if read_plan_inputs; then
      if ! run_mapping_command plan \
        --mapping-source "$mapping_source" \
        --private-root "$private_root" \
        --package-name "$package_name"; then
        exit_status=1
      fi
    else
      printf '%s\n' '已取消：所有输入都必须填写。'
    fi
    ;;
  2)
    printf '%s\n' '警告：Apply 会写 owner-only private configuration；它不会授予 agent 执行权限。'
    if read_plan_inputs; then
      read -r -p '输入 WRITE PRIVATE CONFIG 继续：' confirmation
      if [[ "$confirmation" != 'WRITE PRIVATE CONFIG' ]]; then
        printf '%s\n' '已取消：确认文本不匹配。'
      elif ! run_mapping_command apply \
        --mapping-source "$mapping_source" \
        --private-root "$private_root" \
        --package-name "$package_name" \
        --confirm-private-config-write; then
        exit_status=1
      fi
    else
      printf '%s\n' '已取消：所有输入都必须填写。'
    fi
    ;;
  3)
    read -r -p '既有完整 owner-only private root 的绝对路径：' private_root
    read -r -p 'mapping package 名称：' package_name
    if [[ -z "$private_root" || -z "$package_name" ]]; then
      printf '%s\n' '已取消：两个输入都必须填写。'
    elif ! run_mapping_command check \
      --private-root "$private_root" \
      --package-name "$package_name"; then
      exit_status=1
    fi
    ;;
  *)
    printf '%s\n' '已取消：没有执行任何操作。'
    ;;
esac

read -r -p '按 Enter 关闭...'
exit "$exit_status"
