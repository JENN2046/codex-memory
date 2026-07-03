# VCP Memory Observe-Lite CM1805 DailyNoteSearcher Primary Linux Candidate Install Receipt

Task id: `M6-OBSERVE-LITE-DAILYNOTESEARCHER-PRIMARY-LINUX-CANDIDATE-INSTALL`
Implementation slice: `CM-1805`
Date: 2026-07-04
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_LITE_CM1804_DAILYNOTESEARCHER_ISOLATED_TOOLCHAIN_LOCKED_X64_BUILD_RECEIPT.md`
Evidence type: `binary-install`, `no-runtime`, `no-log`,
`no-response-body`, `no-secret`, `no-memory-write`

## Boundary

CM-1805 installs the CM-1804 Linux x64 release binary into the first Linux
candidate path selected by the DailyNoteSearcher source:

```text
source: Plugin/DailyNoteSearcher/src/target/release/DailyNoteSearcher
target: Plugin/DailyNoteSearcher/DailyNoteSearcher
```

It performs one external VCPToolBox file write using `install -m 755`, then
reads only file metadata and hashes. It does not start VCPToolBox, execute
DailyNoteSearcher as a service, read runtime logs, read stdout/stderr from
runtime, read response bodies, read `config.env` or `.env` contents, read raw
memory, call provider APIs by the agent, call MCP memory tools, write memory,
expand public MCP tools, release, deploy, cut over, push, create an approval
line, or claim readiness.

## Install Result

| Field | Result |
|---|---|
| Primary Linux candidate existed before install | `NO` |
| Install command | `install -m 755` |
| Install command exit code | `0` |
| Source path | `Plugin/DailyNoteSearcher/src/target/release/DailyNoteSearcher` |
| Target path | `Plugin/DailyNoteSearcher/DailyNoteSearcher` |
| Source and target byte-identical | `YES` |
| SHA-256 | `20444e1d1ee650c9add0905f7fa851217863c43a5fab243ba78cc05cae5d65df` |
| Target file header | `ELF 64-bit LSB pie executable, x86-64` |
| Target mode | `755` |
| Target size | `3735640` |
| Target executable | `YES` |
| Runtime started | `NO` |
| Binary executed by agent | `NO` |

VCPToolBox status now includes the new untracked primary Linux candidate:

```text
?? Plugin/DailyNoteSearcher/DailyNoteSearcher
```

Pre-existing unrelated VCPToolBox dirty/untracked files were not touched.
CM-1798's aarch64 executable mode change remains present and untouched.

## Next Safe Route

Next safe route:

`CM-1806 DailyNoteSearcher primary-candidate status-only rerun`.

Constraints:

- use disposable child-process auth only if needed
- do not disclose or persist bearer values
- do not read response bodies, runtime logs, stdout/stderr from runtime,
  `config.env`, `.env`, raw memory, raw stores, provider responses, or memory
  results
- no memory write
- no public MCP expansion
- no release/deploy/cutover/push
- no readiness, M6 completion, M15 unlock, complete V8, or full bridge
  completion claim unless the later proof explicitly supports it

## Evidence

```yaml
cm1805_dailynotesearcher_primary_linux_candidate_install:
  local_target_is_disposable_integration_target: true
  plan_package_preauthorization_context_applied: true
  external_vcptoolbox_file_write_performed: true
  source_release_binary: Plugin_DailyNoteSearcher_src_target_release_DailyNoteSearcher
  target_primary_linux_candidate: Plugin_DailyNoteSearcher_DailyNoteSearcher
  target_existed_before_install: false
  install_command: install_m_755
  install_exit_code: 0
  source_target_byte_identical: true
  sha256: "20444e1d1ee650c9add0905f7fa851217863c43a5fab243ba78cc05cae5d65df"
  target_binary_header: elf_64_lsb_pie_executable_x86_64
  target_binary_mode: 755
  target_binary_size_bytes: 3735640
  target_executable: true
  runtime_started_by_agent: false
  binary_executed_by_agent: false
  response_body_read: false
  runtime_stdout_read: false
  runtime_stderr_read: false
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
  next_action: cm1806_dailynotesearcher_primary_candidate_status_only_rerun
```
