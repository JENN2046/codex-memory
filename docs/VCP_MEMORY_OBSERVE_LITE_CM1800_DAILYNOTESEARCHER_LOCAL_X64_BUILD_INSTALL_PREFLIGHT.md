# VCP Memory Observe-Lite CM1800 DailyNoteSearcher Local X64 Build Install Preflight

Task id: `M6-OBSERVE-LITE-DAILYNOTESEARCHER-LOCAL-X64-BUILD-INSTALL-PREFLIGHT`
Implementation slice: `CM-1800`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1799_DAILYNOTESEARCHER_BINARY_COMPATIBILITY_DIAGNOSIS.md`
Evidence type: `toolchain-preflight`, `dependency-action-simulation`,
`source-metadata-only`, `no-runtime`, `no-log`, `no-response-body`,
`no-secret`, `no-write`

## Boundary

CM-1800 determines whether the local DailyNoteSearcher Rust source can be built
for Linux x64. It does not install packages, compile code, start VCPToolBox,
execute DailyNoteSearcher, read runtime logs, read stdout/stderr from runtime,
read response bodies, read `config.env` or `.env` contents, read raw memory,
call provider APIs by the agent, call MCP memory tools, write memory, modify
VCPToolBox files, expand public MCP tools, release, deploy, cut over, push,
create an approval line, or claim readiness.

## Findings

| Check | Result |
|---|---|
| `cargo --version` | `command not found` |
| `rustc --version --verbose` | `command not found` |
| `rustup` present | `NO` |
| `apt-get` present | `YES` |
| passwordless `sudo` available | `YES` |
| Rust source `Cargo.toml` present | `YES` |
| Rust source `Cargo.lock` present | `YES` |
| Rust source `src/main.rs` present | `YES` |
| `cargo metadata --locked` | `not runnable because cargo absent` |

`Cargo.toml` declares these package dependencies:

```text
serde
serde_json
walkdir
regex
pathdiff
ignore
chrono
```

The exact simulated package-manager action is:

```text
sudo apt-get -s install cargo rustc
```

Simulation result:

| Field | Result |
|---|---|
| Newly installed packages | `8` |
| Upgraded packages | `0` |
| Removed packages | `0` |
| Not upgraded packages | `36` |

Simulated new packages:

```text
cargo
libgit2-1.7
libhttp-parser2.9
libllvm17t64
libssh2-1t64
libstd-rust-1.75
libstd-rust-dev
rustc
```

## Decision

CM-1800 does not build yet because the Rust toolchain is absent.

The next action is exact and bounded:

```text
sudo apt-get install -y cargo rustc
```

This is a system dependency action, not a VCPToolBox content change. It should
be recorded separately as CM-1801 before any build/install of the
DailyNoteSearcher binary.

## Next Safe Route

Next safe route:

`CM-1801 exact Rust toolchain dependency install`.

Constraints:

- install only the simulated package action `cargo rustc`
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
cm1800_dailynotesearcher_local_x64_build_install_preflight:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  source_metadata_only: true
  dependency_action_simulation_only: true
  cargo_present: false
  rustc_present: false
  rustup_present: false
  apt_get_present: true
  passwordless_sudo_available: true
  cargo_toml_present: true
  cargo_lock_present: true
  rust_main_present: true
  cargo_metadata_runnable: false
  simulated_install_command: sudo_apt_get_install_y_cargo_rustc
  simulated_new_package_count: 8
  simulated_upgrade_count: 0
  simulated_remove_count: 0
  package_install_performed: false
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
  vcptoolbox_file_modified_by_cm1800: false
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
  next_action: cm1801_exact_rust_toolchain_dependency_install
```
