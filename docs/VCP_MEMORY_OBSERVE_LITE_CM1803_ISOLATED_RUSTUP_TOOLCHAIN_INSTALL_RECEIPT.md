# VCP Memory Observe-Lite CM1803 Isolated Rustup Toolchain Install Receipt

Task id: `M6-OBSERVE-LITE-ISOLATED-RUSTUP-TOOLCHAIN-INSTALL`
Implementation slice: `CM-1803`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1802_DAILYNOTESEARCHER_LOCKED_LOCAL_X64_BUILD_ATTEMPT.md`
Evidence type: `isolated-toolchain-install`, `no-runtime`, `no-log`,
`no-response-body`, `no-secret`, `no-memory-write`

## Boundary

CM-1803 installs a Rust stable toolchain into VCPToolBox-local isolated
directories only:

```text
RUSTUP_HOME=/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox/.rustup-cm1803
CARGO_HOME=/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox/.cargo-cm1803
--profile minimal
--default-toolchain stable
--no-modify-path
```

It does not use apt `rustup`, does not remove apt `cargo`/`rustc`, does not
modify shell PATH/profile files, does not build DailyNoteSearcher, start
VCPToolBox, execute DailyNoteSearcher as a service, read runtime logs, read
stdout/stderr from runtime, read response bodies, read `config.env` or `.env`
contents, read raw memory, call provider APIs by the agent, call MCP memory
tools, write memory, expand public MCP tools, release, deploy, cut over, push,
create an approval line, or claim readiness.

## Install Result

| Field | Result |
|---|---|
| Install command exit code | `0` |
| `--no-modify-path` used | `YES` |
| Isolated `RUSTUP_HOME` created | `YES` |
| Isolated `CARGO_HOME` created | `YES` |
| Global PATH/profile modified by installer | `NO` |
| apt `cargo`/`rustc` removed | `NO` |
| Toolchain | `stable-x86_64-unknown-linux-gnu` |
| `cargo --version` | `cargo 1.96.1` |
| `rustc` release | `1.96.1` |
| `rustc` host | `x86_64-unknown-linux-gnu` |
| `cargo metadata --locked` | `PASS` |
| Build performed | `NO` |

VCPToolBox status changed by CM-1803 only through these new isolated toolchain
directories:

```text
.cargo-cm1803/
.rustup-cm1803/
```

## Next Safe Route

Next safe route:

`CM-1804 DailyNoteSearcher isolated-toolchain locked x64 build`.

Use the isolated cargo binary:

```text
RUSTUP_HOME=/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox/.rustup-cm1803
CARGO_HOME=/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox/.cargo-cm1803
/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox/.cargo-cm1803/bin/cargo build --release --locked
```

Constraints:

- no root-wide VCPToolBox search
- no `config.env` or `.env` read/edit
- no runtime logs, response bodies, stdout/stderr from runtime, raw memory, raw
  stores, or memory results read
- no provider/API call by agent
- no public MCP expansion
- no release/deploy/cutover/push
- no readiness, M6 completion, M15 unlock, complete V8, or full bridge
  completion claim

## Evidence

```yaml
cm1803_isolated_rustup_toolchain_install:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  isolated_toolchain_install_performed: true
  install_exit_code: 0
  rustup_home: VCPToolBox_dot_rustup_cm1803
  cargo_home: VCPToolBox_dot_cargo_cm1803
  no_modify_path_used: true
  global_path_profile_modified: false
  apt_cargo_rustc_removed: false
  toolchain: stable_x86_64_unknown_linux_gnu
  cargo_version: "1.96.1"
  rustc_release: "1.96.1"
  rustc_host: x86_64_unknown_linux_gnu
  cargo_metadata_locked_passed: true
  cargo_build_performed: false
  runtime_started_by_agent: false
  binary_executed_by_agent: false
  response_body_read: false
  stdout_read: false
  stderr_read: false
  runtime_logs_read: false
  config_env_content_read: false
  env_content_read: false
  secrets_read: false
  raw_memory_read_by_agent: false
  raw_store_read_by_agent: false
  provider_api_called_by_agent: false
  mcp_memory_tool_called: false
  memory_write_performed: false
  public_mcp_expansion_performed: false
  release_tag_deploy_cutover_performed: false
  push_performed: false
  approval_line_present: false
  approval_line_generated: false
  approval_granted: false
  readiness_claimed: false
  rc_ready_claimed: false
  complete_v8_claimed: false
  full_bridge_completion_claimed: false
  m6_observe_lite_handshake_complete: false
  m15_unlocked: false
  next_action: cm1804_dailynotesearcher_isolated_toolchain_locked_x64_build
```
