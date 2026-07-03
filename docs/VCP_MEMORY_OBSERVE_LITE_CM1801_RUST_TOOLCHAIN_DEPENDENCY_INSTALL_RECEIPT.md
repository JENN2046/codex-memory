# VCP Memory Observe-Lite CM1801 Rust Toolchain Dependency Install Receipt

Task id: `M6-OBSERVE-LITE-RUST-TOOLCHAIN-DEPENDENCY-INSTALL`
Implementation slice: `CM-1801`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1800_DAILYNOTESEARCHER_LOCAL_X64_BUILD_INSTALL_PREFLIGHT.md`
Evidence type: `exact-dependency-action`, `toolchain-install`,
`no-runtime`, `no-log`, `no-response-body`, `no-secret`, `no-memory-write`

## Boundary

CM-1801 executes only the exact dependency action preflighted by CM-1800:

```text
sudo apt-get install -y cargo rustc
```

It does not build DailyNoteSearcher, start VCPToolBox, execute
DailyNoteSearcher, read runtime logs, read stdout/stderr from runtime, read
response bodies, read `config.env` or `.env` contents, read raw memory, call
provider APIs by the agent, call MCP memory tools, write memory, modify
VCPToolBox source/content, expand public MCP tools, release, deploy, cut over,
push, create an approval line, or claim readiness.

## Install Result

| Field | Result |
|---|---|
| Command | `sudo apt-get install -y cargo rustc` |
| Exit code | `0` |
| Downloaded archives | `97.4 MB` |
| Additional disk used | `419 MB` |
| Newly installed packages | `8` |
| Upgraded packages | `0` |
| Removed packages | `0` |
| Not upgraded packages | `36` |

Installed package versions:

```text
cargo 1.75.0+dfsg0ubuntu1-0ubuntu7.4
libgit2-1.7 1.7.2+ds-1ubuntu3
libhttp-parser2.9 2.9.4-6build1
libllvm17t64 1:17.0.6-9ubuntu1
libssh2-1t64 1.11.0-4.1ubuntu0.24.04.2
libstd-rust-1.75 1.75.0+dfsg0ubuntu1-0ubuntu7.4
libstd-rust-dev 1.75.0+dfsg0ubuntu1-0ubuntu7.4
rustc 1.75.0+dfsg0ubuntu1-0ubuntu7.4
```

Toolchain verification:

| Check | Result |
|---|---|
| `cargo --version` | `cargo 1.75.0` |
| `rustc --version --verbose` release | `1.75.0` |
| `rustc` host | `x86_64-unknown-linux-gnu` |
| `cargo metadata --no-deps --format-version 1 --locked` | `PASS` |
| Cargo target directory | `Plugin/DailyNoteSearcher/src/target` |
| Build performed | `NO` |
| New VCPToolBox build directory after metadata | `NO` |

## Next Safe Route

Next safe route:

`CM-1802 DailyNoteSearcher locked local x64 build`.

Constraints:

- run only a bounded local Cargo build for the checked-in DailyNoteSearcher
  source
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
cm1801_rust_toolchain_dependency_install:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  exact_dependency_action_performed: sudo_apt_get_install_y_cargo_rustc
  install_exit_code: 0
  newly_installed_package_count: 8
  upgraded_package_count: 0
  removed_package_count: 0
  not_upgraded_package_count: 36
  downloaded_archives_mb: 97.4
  additional_disk_mb: 419
  cargo_version: "1.75.0"
  rustc_release: "1.75.0"
  rustc_host: x86_64_unknown_linux_gnu
  cargo_metadata_locked_passed: true
  cargo_target_directory: Plugin_DailyNoteSearcher_src_target
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
  vcptoolbox_content_modified_by_cm1801: false
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
  next_action: cm1802_dailynotesearcher_locked_local_x64_build
```
