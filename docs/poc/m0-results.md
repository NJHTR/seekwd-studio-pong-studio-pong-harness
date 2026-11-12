# M0 真机 PoC 结果：easyCode app-server（Windows）

> 状态：链路通过（PASS）。本文件记录真机命令、时间线、事件计数、审批往返、长会话内存、失败项与对 ADR 的偏差。
> 所有数字来自本文命令的实际运行，未做估算或补写。

## 1. 结论摘要

| 项 | 结果 |
|---|---|
| `easycode app-server --listen stdio://` 启动与握手 | 通过 |
| `initialize` / `initialized` | 通过（canonical run：从进程启动到响应 163 ms） |
| `thread/start`（临时 cwd、experimentalApi、dynamicTools） | 通过（87 ms） |
| `turn/start` 完成真实小任务（读文件 + 改文件） | 通过（19.7 s，真实执行 shell 命令） |
| 命令审批 request/response | 通过（真实审批 5 次，host 应答 0–1 ms，服务端观测 0–8 ms） |
| dynamic tool 回调（`pong_echo`） | 通过（真实 `item/tool/call`，返回 `pong_echo: pong-poc`） |
| `turn/interrupt` | 通过（turn 终态 `interrupted`，应答 618–782 ms） |
| 重复 `turn/interrupt`（已结束 turn） | **不符合 ADR 预期**：服务端 90 s 内无响应（见 §7 B2） |
| `thread/resume` | 通过，但要求该 thread 已有落盘 rollout（见 §7 B3） |
| 30 分钟长会话 | 通过：30 turns / 0 failures / 内存 160.9–169.7 MB（见 §6） |
| `runtime.lock.json` + `scripts/schema-diff.mjs` | 通过（check 与 write 均 OK） |
| 包单测 / typecheck / eslint | 40/40 tests，`tsc --noEmit` 0 error，eslint 0 error |

## 2. 环境

| 项 | 值 |
|---|---|
| 采集时间 | 2026-11-12 16:06:45Z – 16:37:45Z（本地 UTC+8 00:06–00:37） |
| OS | Windows 10.0.26200（`platformOs=windows`） |
| Node（PoC 宿主） | v22.17.0 |
| 仓库要求 | Node >= 24.0.0、pnpm >= 12.4.2（本机不满足，见 §7 B1） |
| easyCode 二进制 | `C:\Users\NJHTR\IdeaProjects\easyCode\dist\easyCode-windows-x64-portable\bin\easycode.exe` |
| `easycode --version` | `easycode-cli 0.0.0` |
| `easycode.exe` sha256 | `3b348e6ca36ad1f47925c86f60ee353e94d7830daaeea63a42d20ecea67e865f` |
| EASYCODE_HOME | `C:\Users\NJHTR\.easycode` |
| 模型 | `deepseek-flash`（provider `deepseek`，来自本机 `config.toml`） |
| 传输 | stdio JSONL，自定义信封（无 `jsonrpc` 字段） |
| canonical run 产物 | `scripts/poc/.artifacts/canonical-all/`（`raw.jsonl` 1,398 条，`summary.json`） |
| interrupt 专项 probe | `scripts/poc/.artifacts/interrupt-silent-probe/` |

## 3. 复现命令

```powershell
# 0) 确认二进制
& "C:\Users\NJHTR\IdeaProjects\easyCode\dist\easyCode-windows-x64-portable\bin\easycode.exe" --version

# 1) 最小链路（握手 + thread/start）
node scripts/poc/easycode-poc.mjs --phase smoke

# 2) 真实 turn（读文件 + 改文件 + 命令审批）
node scripts/poc/easycode-poc.mjs --phase turn

# 3) dynamic tool 回调
node scripts/poc/easycode-poc.mjs --phase tool

# 4) interrupt
node scripts/poc/easycode-poc.mjs --phase interrupt

# 5) resume
node scripts/poc/easycode-poc.mjs --phase resume

# 6) 完整链路（含 30 分钟长会话）；真实采集即用此命令
node scripts/poc/easycode-poc.mjs --phase all --long-minutes 30 --out-dir scripts/poc/.artifacts/canonical-all

# 7) 协议层单测 / 类型 / lint
pnpm --filter @pong/easycode-runtime test
pnpm --filter @pong/easycode-runtime typecheck
pnpm --filter @pong/easycode-runtime lint

# 8) schema 锁定与漂移检查
pnpm --filter @pong/easycode-runtime build
node scripts/schema-diff.mjs --check
node scripts/schema-diff.mjs --write   # 仅在有意升级 easyCode 后
```

每次 PoC 运行都在 `--out-dir` 写入 `raw.jsonl`（全部收发消息）、`summary.json`（机器可读汇总）、`app-server.stderr.log`。`.artifacts/` 已在 `scripts/poc/.gitignore` 忽略。

## 4. 时间线（canonical run）

canonical run：`--phase all --long-minutes 30`，总时长 **1,859.2 s**，`failures = 0`。偏移以 `meta.startedAt = 2026-11-12T16:06:45.899Z` 为 0。

| 偏移 | 事件 | 说明 |
|---|---|---|
| 0.0 s | spawn 子进程，发出 `initialize` | — |
| 0.2 s | `initialize` 响应；发出 `initialized` | 握手 163 ms（含 spawn） |
| 0.2 s | 发出 `thread/start` | — |
| 0.3 s | `thread/start` 响应，thread `01a1d082-f642-74b3-87c3-a76e98454d99` | 87 ms |
| 0.3 s | 真实任务 `turn/start` | 读 `poc-input.txt` + 改 `poc-notes.txt` |
| 20.0 s | 真实任务 `turn/completed`（`completed`） | 19.7 s，5 次命令审批 |
| 20.0 s | dynamic tool turn `turn/start` | 注册的 `pong_echo` |
| 21.4 s | `item/tool/call` 到达并应答 | host 往返 0 ms |
| 22.7 s | dynamic tool turn `turn/completed` | 2.7 s |
| 22.7 s | interrupt turn `turn/start` | 列出并读取目录内容 |
| 25.2 s | 第一次 `turn/interrupt` 发出 | 等待 2.5 s 后中断 |
| 26.0 s | interrupt 响应 `{}`；`turn/completed` 状态 `interrupted` | 应答 782 ms |
| 26.0 s | 第二次 `turn/interrupt`（同一 turnId）发出 | 30 s 后超时，无任何响应 |
| 56.0 s | resume warmup turn 开始 | 为 resume 制造 rollout |
| 57.6 s | warmup turn `completed` | 1.6 s |
| 57.9 s | `thread/resume` 响应 | thread 状态 `idle` |
| 58.0 s | resume 后 turn `turn/start` | — |
| 59.1 s | resume 后 turn `completed` | 1.1 s |
| 59.1 s | 长会话第 1 个 turn `turn/start` | 30 分钟计时开始 |
| 1840.6 s | 长会话第 30 个 turn `turn/completed` | 30 turns / 0 failures |
| 1859.1 s | 关 stdin → 子进程退出 | shutdown 59 ms |
| 1859.2 s | run 结束 | 1,859.2 s |

## 5. 事件计数与审批往返

canonical run 共收到 **1,398** 条消息（含请求/响应/通知）。按方法计数（全部收发）：

| 方法 | 次数 | 方法 | 次数 |
|---|---:|---|---:|
| `item/reasoning/textDelta` | 643 | `item/agentMessage/delta` | 191 |
| `item/started` | 83 | `item/completed` | 82 |
| `thread/status/changed` | 82 | `(response)` | 47 |
| `thread/tokenUsage/updated` | 40 | `account/rateLimits/updated` | 40 |
| `warning` | 36 | `turn/start` | 35 |
| `turn/started` | 35 | `turn/completed` | 35 |
| `item/commandExecution/outputDelta` | 18 | `item/commandExecution/requestApproval` | 6 |
| `serverRequest/resolved` | 6 | `skills/changed` | 5 |
| `turn/interrupt` | 2 | `thread/start` / `thread/resume` | 1 / 1 |
| `initialize` / `initialized` | 1 / 1 | `configWarning` | 1 |

分阶段事件增量（`summary.json` 的 `eventDelta`）：

| 阶段 | 事件数 | 关键计数 |
|---|---:|---|
| 真实任务 turn | 786 | `item/started` 12、`item/completed` 12、审批请求 5、命令输出增量 18、agentMessage delta 134 |
| dynamic tool turn | 33 | `item/tool/call` 1、`item/completed` 3、agentMessage delta 14 |
| interrupt turn | —（含在上表） | 审批请求 1（第 6 次）、命令输出增量若干 |
| resume warmup / 后续 turn | 15 / 15 | 各 1 次 `turn/completed` |
| 长会话 30 turns | 421 | 每 turn 14–15 事件，全部 `completed` |

真实任务审批明细（5 次，全部 `accept`）：

| # | 命令（截断） | host 往返 | 服务端观测往返 | 备注 |
|---|---|---:|---:|---|
| 1 | `Get-Content -LiteralPath poc-input.txt` | 0 ms | 8 ms | 读文件 |
| 2 | `echo poc-updated >> poc-notes.txt` | 0 ms | 1 ms | 沙箱 read-only 仍拒绝，命令 exit 1 |
| 3 | `Get-Content -LiteralPath poc-notes.txt` | 0 ms | 0 ms | 读取失败（文件尚未创建） |
| 4 | `echo poc-updated >> poc-notes.txt` | 0 ms | 1 ms | reason: “Write access is needed… sandbox is read-only.” |
| 5 | `Get-Content -LiteralPath poc-notes.txt` | 0 ms | 1 ms | 读取成功，内容 `poc-updated` |

说明：host 往返指“收到请求 → 写入应答”的本地耗时（0–1 ms，读循环未阻塞）；服务端观测往返用
`startedAtMs` 到应答时刻计算（0–8 ms）。120 s 超时 decline 路径未在真机触发；由 `approval.test.ts`
用 fake timer 覆盖（默认 120,000 ms，恰好 119,999 ms 不触发）。

dynamic tool 回调：`pong_echo({"text":"pong-poc"})` → host 返回
`{contentItems:[{type:'inputText',text:'pong_echo: pong-poc'}], success:true}`，模型最终回复
`Tool output: \`pong_echo: pong-poc\``。`callId=call_00_ET_7UsYGLlN8QEqbcqm7TDo7447`，host 往返 0 ms。

## 6. 30 分钟长会话

命令：`node scripts/poc/easycode-poc.mjs --phase all --long-minutes 30`

- 计时窗口（`longSession.wallMs`）：**1,800,002 ms（30.0 min）**，到点后停止发 turn。
- turns：**30**；failures：**0**；每 turn 事件 14–15，合计 421 事件。
- 单 turn 耗时（`turn.completed.turn.durationMs`）：min **829 ms** / avg **1,144 ms** / max **1,458 ms**。
- 每 turn 间隔约 60 s（脚本按 60 s 节拍发下一个 turn）。
- 内存采样：每 turn 后用 PowerShell 读取 app-server 进程的 `WorkingSet64` / `PrivateMemorySize64`，共 30 个样本。

| 指标（Working Set，MB） | 值 |
|---|---:|
| first（t=2 s） | 165.1 |
| last（t=1782 s） | 161.5 |
| min | 160.9 |
| max | 169.7 |

| 指标（Private Memory，MB） | 值 |
|---|---:|
| first | 64.7 |
| last | 67.9 |
| 采样区间 | 64.0–69.3 |

内存曲线（t 秒: WorkingSet/Private MB）：

```
2:165.1/64.7   63:165.0/64.9  124:165.0/64.6  186:165.2/64.6  247:165.1/64.4
308:164.8/64.0 370:165.3/64.8 431:165.9/65.7  493:164.7/65.6  554:166.1/65.8
616:165.9/65.8 677:166.1/66.3 739:165.9/65.3  800:167.0/66.2  862:169.1/68.5
923:167.5/67.3 985:168.0/67.6 1046:168.4/68.0 1107:168.4/67.5 1169:168.5/67.9
1230:168.4/67.6 1291:169.7/68.7 1353:160.9/67.5 1414:161.6/67.8 1475:161.7/67.7
1536:162.5/69.3 1598:162.2/68.1 1659:161.8/67.4 1720:162.0/67.7 1782:161.5/67.9
```

结论：30 分钟内 Working Set 在 161–170 MB 区间波动，末值低于首值；Private Memory 缓慢上升
64.7 → 67.9 MB（+3.2 MB，30 turns），没有单调快速增长。M0 只能说明“30 分钟内无显著泄漏”；
更长时间的曲线与 rollout/SQLite 增长属于 M1 观察项。

## 7. 失败项、偏差与风险（如实记录）

### B1（环境阻塞）本机不满足仓库工具链要求

仓库根 `package.json` 要求 `node >= 24.0.0`、`pnpm >= 12.4.2`；本机为 Node v22.17.0 + pnpm 11.1.3。
`pnpm install --filter @pong/easycode-runtime --offline --ignore-scripts --lockfile=false` 被
`ERR_PNPM_UNSUPPORTED_ENGINE` 拒绝。

处理：M0 验证直接调用已安装的 vitest/tsc/eslint 可执行文件，并在包目录内用 junction 建立所需的
`node_modules` 链接（`vitest`、`typescript`、`eslint`、`@pong/typescript-config`、`@pong/eslint-config`）。
**遗留动作**：在上游工具链（Node 24 + pnpm 12）下执行 `pnpm install`，该命令会把新 workspace 包的
importer 写入根 `pnpm-lock.yaml`。根锁文件不在本任务写权限内，故未改动。

### B2（协议阻塞）已结束 turn 的重复 `turn/interrupt` 无响应

ADR-02 假设：`turn/interrupt` 在无 active turn 时返回 `invalid_request("no active turn")`。
实测（两次独立运行）：

| 运行 | 第一次 interrupt | 第二次 interrupt（同一 turnId） |
|---|---|---|
| canonical run | 应答 `{}`，turn 终态 `interrupted` | 30 s 超时，无任何响应 |
| 专项 probe | 应答 `{}`，turn 终态 `interrupted`（618 ms） | **90 s 超时，无任何响应** |
| 单测 fake-server 覆盖 | 返回 `-32600 invalid_request: no active turn` | supervisor 映射为 `no-active-turn` |

结论：真实二进制在该版本不会回 `invalid_request`，而是**静默**。宿主必须：
1. 给 `turn/interrupt` 自己设短超时（建议 5 s），超时视为“已结束”；
2. 不因第二次 interrupt 无响应而重建进程（与 ADR-02 第 3 条的“不重建”一致，但触发条件不同）；
3. 保留对 `-32600 / "no active turn"` 的兼容映射（其他版本/未来版本仍可能返回）。

专项 probe 命令：`node scripts/poc/easycode-poc.mjs --phase interrupt --second-interrupt-timeout 90 --out-dir scripts/poc/.artifacts/interrupt-silent-probe`。

### B3 `thread/resume` 需要已落盘 rollout

`thread/start` 后立即 `thread/resume` 返回：

```
thread/resume: no rollout found for thread id 01a1d080-f0cd-7382-b785-5ed06cc484c6
```

完成至少一个 turn 后再 resume 成功（canonical run 与 `--phase resume` 均验证）。
宿主恢复逻辑必须在 workspace 检查之外再加“thread 是否有 rollout”的条件，否则新会话恢复会直接报错。

### B4 PowerShell 重定向写文件为 UTF-16LE；审批通过 ≠ 沙箱放行

canonical run 中真实任务产生 5 条命令、3 次失败：

1. `Get-Content poc-input.txt` → exit 0，输出 `pong-m0-poc input line`。
2. `echo poc-updated >> poc-notes.txt` → **exit 1**，`Out-File` 抛 `UnauthorizedAccessException`；
   该命令的审批已被 accept，但 turn 的 `sandboxPolicy=readOnly` 仍然拒绝写入。
3. `Get-Content poc-notes.txt` → exit 1，文件不存在。
4. 模型再次请求 `echo ... >> ...`，审批带 reason：“Write access is needed to append one line to
   poc-notes.txt; the sandbox is read-only.”；accept 后 exit 0。
5. `Get-Content poc-notes.txt` → exit 0，输出 `poc-updated`。

由此得到两条实现约束：

- **审批 accept 不等于沙箱放行**。read-only turn 里第一次审批通过后命令仍失败；宿主/验收器不能把
  “审批已应答”当成“操作已成功”，必须以命令 `exitCode` 和文件实际内容为准。
- PowerShell 5.1 的 `>>` 写出 UTF-16LE + BOM。PoC 的文本归一化（去 NUL）会留下两个 `U+FFFD`
  代表 BOM 字节；真实文本为 `poc-updated`。验收器应按字节或按编码解码，不能假定 UTF-8。
  早期一次开发迭代还遇到 `echo x>>file`（无空格）被 PowerShell 当作单个字符串、退出码非 0 的问题；
  最终 prompt 统一写成带空格的 `echo x >> file`。

### B5 首次迭代（已修正，非最终链路）

- 第一版 PoC 的 thread 默认 `approvalPolicy=on-request` + `workspace-write` 时，工作区内的读写命令不会触发审批。
  改为在真实任务 turn 上覆写 `approvalPolicy=untrusted` + `sandboxPolicy=readOnly` 后，审批稳定触发。
  canonical run 的 thread 仍使用 ADR 默认 `on-request`，仅该 turn 覆写。
- 这证明“审批何时出现”由 policy/sandbox 共同决定；宿主不能只在 thread 级配置上做假设。

### B6 schema 生成产物内部仍用 codex 命名

`generate-json-schema` 输出 318 个文件（含 `codex_app_server_protocol.schemas.json` 与
`codex_app_server_protocol.v2.schemas.json`），`schema-diff.mjs` 的哈希覆盖全部文件，因此命名变化会显式失败。

### B7 配置告警（非阻塞）

canonical run 的 `app-server.stderr.log` 只有一条告警：

```
ERROR easycode_app_server: easyCode is ignoring 1 unrecognized configuration setting.
user (...\.easycode\config.toml): `windows.model_instructions_file` is ignored.
```

这是本机 `config.toml` 的旧字段，不影响链路；宿主日志需按“配置告警”归类，不要当成协议错误。
另外每个 turn 开始会收到 `warning` 通知（`Model metadata for deepseek-flash not found. Defaulting ...`），
PoC 计入事件但不阻断。

## 8. 协议事实（M0 实测，供实现参考）

- 信封：`{id, method, params}` / `{id, result}` / `{id, error:{code,message}}` / `{method, params}`，无 `jsonrpc`。
- 客户端方法名：`initialize`、`thread/start`、`thread/resume`、`turn/start`、`turn/interrupt`；通知 `initialized`。
- 服务端请求（审批/工具）：`item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、
  `item/permissions/requestApproval`、`item/tool/requestUserInput`、`item/tool/call`、
  `mcpServer/elicitation/request`、legacy `applyPatchApproval` / `execCommandApproval`。
- 关键通知：`turn/started`、`turn/completed`、`item/started`、`item/completed`、`item/agentMessage/delta`、
  `item/reasoning/textDelta`、`item/commandExecution/outputDelta`、`thread/status/changed`、`serverRequest/resolved`。
- `thread/start.dynamicTools` 为 experimental，必须先 `initialize.capabilities.experimentalApi=true`。
- `turn/completed` 的 `turn.itemsView` 为 `"summary"` 时只带 agentMessage；命令/文件项要从 `item/completed` 通知收集。
- `turn/start` 响应立即返回 `inProgress`，终态在 `turn/completed` 通知里；宿主不能等响应即当完成。
- 审批应答形状：命令/文件改动 `{decision: "accept"|"acceptForSession"|"decline"|"cancel"}`；dynamic tool
  `{contentItems:[{type:"inputText",text}], success:true}`；elicitation `{action:"decline",content:null,_meta:null}`。

## 9. 交付物清单

| 路径 | 说明 |
|---|---|
| `scripts/poc/easycode-poc.mjs` | 真机 PoC：握手、真实 turn、审批、dynamic tool、interrupt、resume、长会话、内存采样 |
| `scripts/poc/.gitignore` | 忽略 `.artifacts/` |
| `packages/@pong/easycode-runtime/package.json` | pnpm workspace 包（`@pong/easycode-runtime`） |
| `packages/@pong/easycode-runtime/src/protocol/` | `generate-ts` 白名单子集（10 个文件，未复制 748 文件） |
| `packages/@pong/easycode-runtime/src/transport.ts` | JSONL 解析、id 关联、有界通知队列、读循环不 await |
| `packages/@pong/easycode-runtime/src/supervisor.ts` | spawn/握手/健康检查/中断/优雅退出；Job Object 接口 |
| `packages/@pong/easycode-runtime/src/approval.ts` | pending 审批 + 120 s 超时 decline + 审计 |
| `packages/@pong/easycode-runtime/src/index.ts` | 公开导出 |
| `packages/@pong/easycode-runtime/test/` | 40 个 Vitest 单测 + fake app-server |
| `packages/@pong/easycode-runtime/runtime.lock.json` | 版本、exe sha256、schema 快照哈希、方法白名单 |
| `packages/@pong/easycode-runtime/README.md` | 包内使用与复现说明 |
| `scripts/schema-diff.mjs` | 重新生成并 diff schema；校验白名单 |
| `docs/poc/m0-results.md` | 本文件 |

## 10. M1 建议（按优先级）

1. 依据 B2 把 interrupt 的宿主侧超时写成契约测试；不要依赖 `invalid_request`。
2. 依据 B3 在 resume 前检查 rollout 是否存在；不存在时走 fork 或新 thread。
3. 用 `scripts/schema-diff.mjs` 接入 CI（需先 build 包）；升级 easyCode 时强制更新 lock。
4. 在 Node 24 + pnpm 12 环境补跑 `pnpm install`，把 importer 写入根锁文件，并跑 `pnpm --filter @pong/easycode-runtime test/typecheck/lint`。
5. 审批/动态工具回调在 M1 接入 `agent_thread_grants` 与 `AgentToolApprovalService`，本包只保留协议与超时职责。
