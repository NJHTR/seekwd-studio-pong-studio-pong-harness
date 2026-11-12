# M0 故障注入结果：easyCode app-server 协议契约

> 状态：**PASS（5/5 场景，真实 easycode + 真实 runtime 包）**，同时记录 1 个真实故障模式与 2 个契约偏差。
> 本文件所有数字来自本文命令的实际运行，未做估算。Artifacts 在 `scripts/poc/.artifacts/`（已 gitignore）。
> `docs/poc/m0-results.md`、`docs/poc/m0-cold-start.md` 由其他任务维护，本文件不改动它们。

## 1. 结论摘要

| 场景 | 判定 | 关键实测 |
|---|---|---|
| S1 读循环暂停 30s 期间审批到达 | PASS（12/12 checks） | 主线程阻塞 **30,010 ms**；审批请求在主线程恢复后 **+1 ms** 才被读到；应答 `accept`；turn `completed`，命令 exitCode=0；`protocolErrors=0` / `notificationsDropped=0` |
| S2 审批 120s 超时 → decline + 审计 | PASS（11/11 checks） | 审计记录 `decision=decline`、`timedOut=true`、`roundtripMs=120,016`；`stats.timedOut=1`；turn `completed`（125,608 ms），命令 item `declined` |
| S3 interrupt / 重复 interrupt | PASS（9/9 checks） | 首次 interrupt **280 ms** → `interrupted`；同一 turnId 再次 interrupt **静默** → 宿主 5 s 兜底 `no-response`（5,007 ms）；自然完成的 turn 再 interrupt → `-32600 no active turn`（5 ms）；PID 不变、health ok、后续 turn 正常 |
| S4 resume 无 rollout | PASS（5/5 checks） | `RemoteProtocolError` code `-32600`：`thread/resume: no rollout found for thread id …`；进程仍 ready，后续 turn `completed`（1,225 ms）；删掉 workspace 内容后 resume 仍成功（服务端只查 rollout） |
| S5 4 进程共享 EASYCODE_HOME 压测 10 min | PASS（9/9 checks） | 负载窗口 **600,220 ms**；**244/244 turns completed**；turn 失败 0、turn 重试 0、busy stderr 0；冷启动 1/4 进程失败并 1 次重启恢复（2,583 ms）；SQLite 总量 4.60 MB → 23.77 MB |
| `--smoke`（CI，fake server） | PASS（43/43 checks） | 13.3 s 跑完 5 个场景；不依赖 easycode.exe / 模型 / 真实 EASYCODE_HOME |

**失败项**：无场景判定失败。记录到 1 个真实故障模式（S5 冷启动 SQLite 竞争，见 §5 F1）和 2 个契约偏差（F2 schema、F3 interrupt 语义）。

## 2. 环境与方法

| 项 | 值 |
|---|---|
| 采集时间（faults） | 2026-11-12T17:28:57Z – 17:31:50Z（本地 UTC+8 01:28–01:31） |
| 采集时间（stress） | 2026-11-12T17:18:36Z – 17:29:01Z（本地 01:18–01:29） |
| Node | v24.22.2（`C:\Users\NJHTR\IdeaProjects\seekwd\.tools\node24\node.exe`） |
| easyCode | `easycode-cli 0.0.0`；sha256 `3b348e6ca36ad1f47925c86f60ee353e94d7830daaeea63a42d20ecea67e865f` |
| 宿主实现 | `packages/@pong/easycode-runtime/dist`（真实包，未改动）：`AppServerSupervisor` + `JsonlTransport` + `ApprovalBroker` |
| EASYCODE_HOME | 隔离临时目录；用 **硬链接** 复用真实 home 的 `config.toml` / `auth.json` / `installation_id`，SQLite 由 app-server 在该目录新建。不写真实 `%USERPROFILE%\.easycode` 的数据库 |
| 工作目录 | `%TEMP%\poc-*`（每次运行新建） |
| 时间语义 | 除标注外均为宿主时钟；服务端时间只在 `approval.startedAtMs` 等字段出现 |

方法要点：

- S1 的“读循环暂停”是**真的阻塞宿主事件循环**（`Atomics.wait`，30 s），不是在协议层延迟应答。暂停期间 app-server 写入的审批请求留在管道，恢复后由真实 `JsonlTransport` 读循环处理。
- S2 不使用 fake timer：`ApprovalBroker` 默认 120,000 ms 真实超时，服务端真实收到 `decline`。
- S5 的进程启动失败会**重启**（每进程 3 次尝试、错峰 backoff），并分别统计 init 失败、init 重试、turn 失败、turn 重试、busy stderr 行。

## 3. 复现命令

```powershell
$node = "C:\Users\NJHTR\IdeaProjects\seekwd\.tools\node24\node.exe"
cd C:\Users\NJHTR\IdeaProjects\seekwd\pong-studio

# CI 入口（fake server，不需要 easycode.exe / 模型；约 13 s）
& $node scripts/poc/fault-injection.mjs --smoke --scenario all

# 真实二进制：4 个快速故障场景（约 2.9 min，含 120 s 真实超时）
& $node scripts/poc/fault-injection.mjs --scenario faults --out-dir scripts/poc/.artifacts/fault-final

# 真实二进制：4 进程共享 EASYCODE_HOME 压测 10 min
& $node scripts/poc/fault-injection.mjs --scenario concurrent-home --stress-minutes 10 --out-dir scripts/poc/.artifacts/stress-final4

# 单场景（调试用）
& $node scripts/poc/fault-injection.mjs --scenario readloop-pause
& $node scripts/poc/fault-injection.mjs --scenario approval-timeout
& $node scripts/poc/fault-injection.mjs --scenario interrupt
& $node scripts/poc/fault-injection.mjs --scenario resume-no-rollout
```

真实运行前脚本会先执行 `easycode --version`，取不到版本直接失败。`--out-dir` 下产物：
`summary.json`（机器可读汇总）、`<scenario>.json`（单场景明细）、`events.jsonl`、`stderr.log`、S2 的 `audit.jsonl`、S5 每进程 `proc-<n>/`。

## 4. 场景明细

### S1 读循环暂停 30 s 期间审批到达（`readloop-pause`）

命令：`--scenario readloop-pause`（artifact：`.artifacts/fault-final/readloop-pause.json`）

| 观测 | 值 |
|---|---|
| 宿主事件循环阻塞 | 30,010 ms（目标 30,000 ms） |
| 暂停开始 / 结束 | 17:28:58.047Z / 17:29:28.057Z |
| 审批请求被读循环处理 | 17:29:28.058Z（暂停结束后 **1 ms**） |
| 审批应答 | `accept`（`item/commandExecution/requestApproval`，命令 `Get-Content … readloop-input.txt`） |
| turn | `completed`，durationMs 32,174，wallMs 32,329 |
| 命令结果 | `commandExecution` status `completed`，exitCode 0 |
| agent 文本 | `readloop-ok`（文件实际内容） |
| transport | inbound 45 / outbound 5，`notificationsDropped=0`，`protocolErrors=0` |
| 关闭 | `no-active-turn → stdin-closed → exited`，150 ms，未强杀 |

判定：**PASS**。30 s 停顿小于审批窗口（120 s），审批不丢、恢复后可应答、turn 正常完成。ADR “读循环永不阻塞”是安全目标，但即使宿主被 GC/写库阻塞 30 s，协议层仍能靠管道缓冲 + 服务端等待扛住。

### S2 审批 120 s 超时 → decline + 审计（`approval-timeout`）

命令：`--scenario approval-timeout`（artifact：`.artifacts/fault-final/approval-timeout.json`、`approval-timeout/audit.jsonl`）

| 观测 | 值 |
|---|---|
| 审批登记 → 超时 | `receivedAtMs` 1794504572421 → `decidedAtMs` 1794504692437 |
| 审计记录 | `decision=decline`，`timedOut=true`，`roundtripMs=120,016`，`kind=commandExecution` |
| stats | pending 0 / declined 1 / timedOut 1 / maxRoundtripMs 120,016 |
| 超时日志 | `warn: approval 0:call_00_H3H… timed out; declined` |
| turn 终端 | `completed`（125,608 ms，即 120 s 等待 + ~5 s 收尾） |
| 命令 item | status `declined`（未执行） |
| 模型反应 | 明确说明命令被拒绝、无法读取文件内容 |

判定：**PASS**。ADR §5.4 的“120 s 超时 → decline + 审计”在真实链路上成立；宿主不能把“审批已应答”当“操作已成功”（此处 item 为 `declined`）。

### S3 interrupt / 重复 interrupt / 自然结束（`interrupt`）

命令：`--scenario interrupt`（artifact：`.artifacts/fault-final/interrupt.json`）

| 用例 | 结果 |
|---|---|
| 活动 turn interrupt（等待 2,500 ms 后） | 应答 `{}`，**280 ms**；turn 终端 `interrupted` |
| 同一 `turnId` 再次 interrupt（宿主 5 s 超时） | **无任何响应**，宿主 5,007 ms 后判定 `no-response`（视为已结束）；PID 未变 |
| 自然完成的 turn 再 interrupt | `-32600 invalid_request: no active turn`，**5 ms** → `no-active-turn` |
| 进程健康 | `ok=true`，state `ready`，PID 不变，未重建 |
| 后续 turn | `completed`（1,289 ms） |
| transport | `protocolErrors=0`，pendingRequests 0 |

判定：**PASS**。宿主 5 s 兜底是必需的；但 m0-results B2 的“重复 interrupt 一律静默”需要收窄：**刚被 interrupt 结束的 turn 重复 interrupt 才静默；自然结束的 turn 返回 -32600**。两种都要映射为“已结束”。

### S4 resume 无 rollout / workspace 内容被删（`resume-no-rollout`）

命令：`--scenario resume-no-rollout`（artifact：`.artifacts/fault-final/resume-no-rollout.json`）

| 用例 | 结果 |
|---|---|
| 新 `thread/start` 后立即 `thread/resume` | 抛 `RemoteProtocolError`，code `-32600`，message `thread/resume: no rollout found for thread id 01a1d0d0-…` |
| 错误后进程 | `ok=true`，state `ready`；后续 turn `completed`（1,225 ms） |
| 已完成 turn（有 rollout）→ 删除 workspace 内全部文件 → resume | **成功**，thread status `idle` |

判定：**PASS**（错误路径按预期失败且不伤进程）。**重要发现**：resume 只检查 rollout 是否存在，**不校验 workspace 内容**；workspace 半 patch/被清空不会在 resume 时报错，宿主必须自己校验 workspace 状态。

### S5 4 进程共享 EASYCODE_HOME 并发写 10 min（`concurrent-home`）

命令：`--scenario concurrent-home --stress-minutes 10`（artifact：`.artifacts/stress-final4/`）

| 指标 | 值 |
|---|---|
| 进程数 / 间隔 | 4 / 每 10 s 一个 slot |
| 负载窗口 | **600,220 ms**（10 min 0.22 s） |
| turns | **244 attempted / 244 completed / 0 failed**（4 × 61） |
| turn 重试 | 0；busy 相关 retry 0 |
| busy stderr 行（database is locked / SQLITE_BUSY 等） | **0** |
| 进程冷启动 | 3/4 一次成功；1/4 首次失败，1 次重试后恢复，恢复耗时 **2,583 ms** |
| thread/start 失败 | 0 |
| SQLite 总量 | 4,602,263 B（t=0）→ **23,773,583 B**（t=600 s）；WAL 为主：`thread_history_1.sqlite-wal` 4,148,872 B、`logs_2.sqlite-wal` 4,338,392 B、`state_5.sqlite-wal` 4,391,952 B |
| Working Set（4 进程） | 起始 130.3–134.6 MB → 结束 151.5–154.8 MB（前 4 min 上升，之后平台期） |
| Private（4 进程） | 46.1–50.4 MB → 63.1–66.7 MB |

补充：同一脚本另外两次 10 min 运行的冷启动结果分别为 **0/4** 与 **2/4** 失败（见 F1），说明这是**间歇性**竞争。`stress-final3`（2/4 失败）中存活 2 进程仍完成 609 s 窗口、58/58 turns、0 失败。

判定：**PASS**（稳态并发写无失败、无 busy 重试、WAL 正常增长）。**但冷启动不是安全的**，见 F1。

## 5. 失败项与偏差（如实记录）

### F1（真实故障模式，major）共享 EASYCODE_HOME 并发冷启动会失败

三次 10 min 压测的冷启动结果：**0/4、2/4、1/4** 进程失败。失败进程 stderr 原文：

```
Error: failed to initialize sqlite state runtime under %TEMP%\easycode-home-<id>: failed to initialize state runtime at %TEMP%\easycode-home-<id>
```

失败后进程以 exit code 1 退出；**服务端自身没有重试**。宿主侧处理：重启进程 + 错峰 backoff（脚本实现 3 次尝试，成功恢复耗时 2,583 ms），恢复后 10 min 内 244/244 turns 完成。

影响：桌面端多 agent 若共享一个 EASYCODE_HOME 且同时首次启动，必须先**串行化首次初始化**（或每进程独立 home / 预初始化一次），不能假设 4 个进程能同时冷启动。M1 应把“并发冷启动恢复”写进 supervisor 策略并加测试。

### F2（契约偏差，major）`workspaceWrite.networkAccess` 真实服务端要 boolean

`@pong/easycode-runtime/src/protocol/turn.ts` 声明 `networkAccess: 'restricted' | 'enabled'`。真实二进制拒绝该形状：

```
turn/start: Invalid request: invalid type: string "restricted", expected a boolean
```

A/B 脚本首次运行时 6/6 run 因此失败（本次用 `networkAccess: false` 通过）。这是 runtime 生成类型 / schema 快照与真实二进制不一致，**本任务未改包**（超出写权限）：M1 前必须修 `protocol/turn.ts` 与 `runtime.lock.json` 的 schema 快照，否则任何用该类型的调用方都会在真机失败。

### F3（语义收窄）重复 interrupt 的静默只发生在“被 interrupt 结束的 turn”

见 S3：对自然完成的 turn，服务端返回 `-32600`。宿主实现仍兼容两种（5 s 兜底 + `no-active-turn` 映射），但 ADR/契约描述应写成条件式。

### F4（校验缺口）`thread/resume` 不校验 workspace

rollout 存在时，即使 workspace 文件全部删除，resume 仍返回 `idle`。ADR-001 resume 前置条件只写了 rollout 检查；workspace 一致性必须由宿主另外校验（例如 patch/hash 检查），否则“半 patch”状态会被静默接受。

### F5（Windows 平台注意）服务端存活时不能删除 thread workspace 根目录

尝试删除 thread 的 cwd 根目录得到 `EBUSY: resource busy or locked`；删除目录内文件可行（S4 用内容删除完成测试）。宿主清理 workspace 必须等进程退出，或改为清空内容。

### F6（方法限制）`--smoke` 不是数据

`--smoke` 使用 `scripts/poc/fake-app-server.mjs`，只验证脚本/断言/CI 入口（13.3 s，43/43 checks），**不能**用于协议结论；所有结论只引用真实 easycode 的运行。

## 6. 对 ADR-001 §5.3/§5.4 的实现含义

1. 读循环非阻塞仍应保留；同时 30 s 级别停顿有管道缓冲兜底，无需额外协议层重传。
2. 审批 120 s 超时 decline + 审计已在真实链路验证，可直接作为 M1 契约测试基线。
3. interrupt 必须实现“5 s 超时视为已结束”，并保留 `-32600` 映射；静默不能作为“需要重建进程”的信号。
4. resume 前置条件需要两层：rollout 存在 + workspace 状态校验。
5. 多进程共享 EASYCODE_HOME：稳态 WAL 并发写安全，**冷启动必须串行化/可重启**；M1 supervisor 需实现重启 + 退避，并记录 init 失败指标。
6. 修正 runtime 的 `networkAccess` 类型与 schema 锁（F2），否则 M1 调用方在真机会失败。

## 7. 交付物

| 路径 | 说明 |
|---|---|
| `scripts/poc/fault-injection.mjs` | 5 个故障场景 + `--smoke`（CI）+ 4 进程 10 min 压测 |
| `scripts/poc/poc-lib.mjs` | 宿主封装（真实 runtime 包）、事件/审批/token 记录、隔离 home、内存/DB 采样 |
| `scripts/poc/fake-app-server.mjs` | 确定性 fake app-server，供 `--smoke` 使用 |
| `docs/poc/m0-fault-injection.md` | 本文件 |
