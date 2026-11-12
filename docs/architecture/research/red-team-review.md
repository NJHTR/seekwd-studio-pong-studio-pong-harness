# 红队对抗评审：easyCode × pong-studio 桌面 agent 方案

> 评审对象：`easycode-analysis.md`、`studio-integration-analysis.md`、`multi-agent-protocol-analysis.md`、`desktop-runtime-analysis.md`（下称 E/S/M/D）。
> 评审立场：假设这套方案已经立项，我要证明它在 6 个月内会失败，并给出不失败的最小改动。
> 证据约定：**实测** = 我在本机跑过/量过（命令与输出可复现）；**代码** = 文件:行号；**判断** = 我的经验判断，无代码证据，明确标注。
> 评审基线：`pong-studio` HEAD `757aaf9`（2026-11-12），`easyCode` 工作区 `dist/easyCode-windows-x64-portable`，Windows 11 26200。
> 注意：四份文档本身是 untracked 文件（`git status` 显示 `?? docs/architecture/`），所有"当前代码"结论没有 commit 绑定，本文的复核也只在上述工作区状态成立。

---

## 0. 我实际执行过的验证（不是读文档）

| # | 动作 | 结果 | 对文档的影响 |
|---|---|---|---|
| V1 | `easycode.exe --version` | `easycode-cli 0.0.0`，exit 0 | 二进制在原生 Windows 可执行；E/D 都未实测这一点 |
| V2 | `app-server --listen stdio://` + 手写 `initialize`/`initialized` | 返回 `{"id":1,"result":{"userAgent":"redteam/0.0.0 (Windows 10.0.26200; x86_64)...","easycodeHome":"C:\\Users\\NJHTR\\.easycode","platformFamily":"windows","platformOs":"windows"}}` | E §12 把 P0 标为待验证；实测已通过，**风险排序错了** |
| V3 | `app-server generate-ts --out <tmp>` | exit 0，生成 **748** 个 .ts | E 的 748 数字正确；但"省大量工作"的判断见 E5 |
| V4 | `easycode --help` / `app-server --help` / `remote-control --help` | 存在 `app`（Desktop app 启动器）、`remote-control start/pair`、`app-server daemon/proxy`、`--ws-auth capability-token\|signed-bearer-token` | E1/D6：三条更便宜的集成路径文档完全没评估 |
| V5 | 体积实测 | `easycode.exe` 344.2MB、portable 520.2MB、`node.exe` 89.6MB、`node24` 102.4MB、`cli/dist` 32.1MB、`editor-ui/dist` 62.9MB | D 的数字基本可信；但 release 来源矛盾见 D1 |
| V6 | 读取本机 pong 最近一次运行的日志 `.logs/pong-server11.log`（15:03 启动，非我本次启动） | 正常到 `Editor is now accessible`；`[license SDK] Skipping renewal on init: license cert is not initialized`；启动期 MCP registry 外联 6s 超时后 `A system task run failed` | S1：license 不是离线首启 blocker；D8：外联面文档漏了 |
| V7 | 读 `~/.easycode` | 有 `auth.json`、`installation_id`、`config.toml`（含被忽略的 `windows.model_instructions_file`）、`state_5.sqlite`、`thread_history_1.sqlite` **109.8MB**、`logs_2.sqlite` **60.6MB**、`thread-writer-locks/`、`.sqlite-maintenance.lock` | D4/E7/D10：共享 EASYCODE_HOME 与提示词通道的坑 |
| V8 | 代码核对 | `CHANNEL_CAPACITY=128`（`app-server-transport/src/transport/mod.rs:24`）；`transport.rs:161-175` 队列满即 disconnect；`turn_processor.rs:1645-1649` interrupt 竞态；全仓 grep 无 `approval_timeout` | 攻击面 (a) 的直接证据 |
| V9 | 仓库盘点 | `pong-studio/.github/workflows` 不存在；但已有 `scripts/build-pong.mjs`（741 行，产出 `compiled/`）与 `docker/images/engine/Dockerfile`（`pnpm deploy --prod` 布局，Node `24.22.2`） | D6：桌面打包重复造轮子 |
| V10 | 体量盘点 | `packages/cli/src/modules/agents` **727** 个 ts / 35 实体；`features/agents` **659** 文件 / **190** 组件 | S4：S 文档把前端与模块工作量低估 2–3 倍 |

---

## 1. 逐份文档反对意见

### 1.1 `easycode-analysis.md`

**E1（blocker）"唯一值得接的集成面是 app-server stdio"是排他性结论，但二进制里还有三条更便宜的路径未评估。**
实测 `easycode --help` 有 `app`（Desktop app 启动器）与 `remote-control start/stop/pair`；`app-server --help` 有 `daemon`（`bootstrap/start/stop/version`，`version` 输出 JSON）与 `proxy --sock`，以及 `--ws-auth capability-token|signed-bearer-token`。
`app-server/src/transport.rs:39-75` 的 `ConnectionState`/`OutboundConnectionState` 与 `thread_state.rs:347-351`（`live_connections`、`thread_ids_by_connection`）证明**多连接、多消费者是一等设计**，不是 hack。
后果：E 把"每 agent 一 stdio 子进程 + 自研 TS 客户端"定为唯一形态，D 在此基础上又加了进程池/Job Object/supervisor。若 daemon+proxy 或 ws+capability-token 可行，桌面侧至少省掉一半复杂度。**要求 M0 做三拓扑对照（per-agent stdio / daemon+proxy / ws+token），再定主线。**

**E2（major）"审批无超时"是否定性断言，证据只有一次 grep。**
E §2.6/§9.2 的结论"宿主必须自实现超时"方向我同意，但论证方式不成立：全仓 grep 不到 `approval_timeout`（我复核过，无匹配）只能证明"没有这个名字"，不能证明不存在基于 tunable/连接生命周期的超时。而 E 自己引的 `v2/item.rs:109`（`TimedOut → Decline`）恰好说明协议层存在"超时"语义的设计意图。
后果：该结论直接派生了 §10.4、D §5.2、M §3.8 三处合同条款。**必须用实测补证**：起一个 turn，故意不回应 `item/commandExecution/requestApproval`，观察 30 分钟后 turn 是否仍挂、进程是否退出。在此之前只能写"未验证"。

**E3（major）工作量基线引用错了，导致 TS 客户端预算偏低。**
E §5/§10.7 写 Python `client.py` 806 行 + `_message_router.py` 336 行 ≈1100 行；实测 924 + 389 = **1313 行**（+15%）。更关键的是这 1313 行不含 pong 侧事件归一化、持久化、审批路由、SSE 映射。
E 自己的 §10.7 列了 8 个模块，其中 `ServerRequestRouter` 要求"未知方法回 error 而不是不回"——这是最容易被上游新方法打破的模块。**预算应按 ≥1.5× 修正（TS 协议层 1.2–1.8k 行，含测试 2.5–3.5k 行）。**

**E4（major）`thread/shellCommand` 的安全证据引了生成物，引用方式与"锁版本"策略自相矛盾。**
E §6.3 用 `sdk/python/src/openai_easycode/generated/v2_all.py:6266` 作证据。生成物会随 `generate-ts`/`generate-python` 重排，行号不可复现；权威注释在 Rust 源码 `app-server-protocol/src/protocol/v2/thread.rs` 的 `ThreadShellCommandParams`（"runs unsandboxed with full access rather than inheriting the thread sandbox policy"）。
更严重的是 E 只说"宿主不要用它"。这是**可直接导致任意命令执行**的 RPC（无沙箱、无审批链），而 pong 侧的连接是宿主自己写的，任何"顺手用一下"都会绕过全部审批。**必须做成白名单外/CI 断言拒绝调用**，而不是口头约束。

**E5（major）"不必手写协议类型"过于乐观：748 个生成文件是负债，不是零成本。**
实测 `generate-ts` 产出 748 个文件，每个手写 import 链。把它们纳入版本控制 + `git diff --exit-code` 意味着：上游任一字段漂移都会变成一次巨大 review；而且生成类型只覆盖 wire shape，覆盖不到请求关联、断线重连、背压、服务器请求路由——这正是 E 自己列出的 8 个手写模块。
**结论**：生成类型只能替代 `protocol/` 目录，不能替代客户端的 60% 工作量；仓库里入库 748 文件前必须定义"只生成、不手改、只允许 adapter 层 import"的边界，否则 pong 的 typecheck/knip/boundaries 会先炸。

**E6（minor）P0/P6 被排成 1 周风险项，实测已完成。**
V2/V3 证明 initialize 与 schema 生成在原生 Windows 通过。真正的未验证项是长 turn、审批、沙箱、code-mode host、多 thread 并发——E §13 的 P0–P6 顺序把最容易的放前面，排期无法据此判断可行性。

**E7（minor）把 AGENTS.md 当"稳定注入面"没有版本承诺。**
`easycode-home/src/instructions/mod.rs:12` 固定读 `AGENTS.md`，但这是**当前版本**的实现；我实测用户旧配置里的 `windows.model_instructions_file` 在新版本已被静默忽略（`configWarning`），说明 easyCode 的"外部化点"同样会随版本漂移。E §3.3 只测了项目级发现算法，没有测跨版本兼容性。

### 1.2 `studio-integration-analysis.md`

**S1（blocker）"最大风险 #1：license 残留导致离线首启失败/降级"不成立。**
本机运行日志（V6）显示离线启动成功，日志明确 `[license SDK] Skipping renewal on init: license cert is not initialized`，服务正常到 `Editor is now accessible`。
S 引用的 `packages/cli/src/commands/base-command.ts:403-434` 实际是 **S3/Azure binary data 模式**的 license 检查（默认 `PONG_DEFAULT_BINARY_DATA_MODE=database` 不触发，见 `:396-410`），不是"启动初始化 license"；真正的初始化在 `commands/start.ts:251` 的 `await this.initLicense()`，而实测该路径在无 license 时是 skip、不是 fail。
**结论**：license 残留是"产品卫生 + 模型上下文污染"问题，不是执行路径失败。把它列为 easyCode 的前置 blocker 会让整个项目先停在一个假问题上。降级为独立清理任务（删 `buildLicenseHints`、删 controller 层 `@Licensed` 的套餐语义），不阻塞运行时。

**S2（major）"工具层 80% 可直接复用"没有任何证据链，且很可能反过来。**
pong 工具是 `BuiltTool` + Zod + `ToolContext`/`InstanceAiContext`（DI、DB、审批、recorder），要在 easyCode 里当 dynamic tool 用，需要：Zod→JSON Schema 转换、在 host 侧异步执行、回填 `DynamicToolCallResponse` 的 contentItems、定义审批归属（谁来批 pong 工具？）。
文档没有给出任何一个工具的转换样例与耗时。反证：`packages/@pong/agents/src/workspace` 只有 `daytona-filesystem.ts` 与 `pong-sandbox-filesystem.ts`，没有 local 实现——说明连"本地文件"这种最基础的工具都需要新写，谈不上 80% 复用。**先做 3 个工具（search_nodes / workflow_run / fs_read）的端到端 PoC 再谈比例。**

**S3（major）"四条执行链路"是修辞，不是事实。**
S §0.3 把"原生 AI Agent 节点"算成一条**对话执行链路**，但 §3 只展开 3 条（Agents / Assistant / Chat Hub）；节点是 workflow 图里的一个步骤，没有 session/thread/approval。
后果：S 用"必须先收敛再注入"当立项理由，但 S §6.5 又要求映射到现有实体，§5.8 却要新建 module + feature + HTTP 面——**"收敛"和"新增第 5 套"在同一份文档里互相抵消**。真正的结论应该是：接入 = 给既有 Agents 会话加一种 runtime，而不是新会话种类。

**S4（major）"改动量"最不可信的是 P1/P2 的周数，不是行数。**
实测体量：`packages/cli/src/modules/agents` **727** ts / 35 实体；`features/agents` **659** 文件 / **190** 组件（S §2.8 写"200+ 文件、90 组件"，低估 3 倍/2 倍）。
在这个体量上，P1 "3-4 周"要同时交付候选 A（1.5-3k 行）+ 候选 B（4-8k 行）+ SSE/实体/DI/RBAC/测试；P2 "2-3 周"要交付新 feature 的全套会话 UI/审批/产物。**判断（无代码证据）：两者至少各低估 2–3 倍。** 更可信的做法是砍 scope（见 §4），而不是加人。

**S5（major）license 引用不完整：真正的阻力在 181 处 `@Licensed` 与模块 `licenseFlag`，不在 10 处 gate。**
实测 `packages/cli/src` 下 `feat:` 含测试共 **181 处**命中，S 只列了 10 处；例如 `project-importer.ts:152`、`import-gates.ts:99`、`workflow-package-importer.ts:217` 会让 pong-packages 导入降级，`feat:folders` 会让 eval 的 thread-restore 直接抛错（`eval/thread-restore.service.ts:103-119`）。桌面版删 license 时如果只按 S 的清单做，会在导入/文件夹/版本历史路径上继续踩坑。

**S6（major）数据真源冲突没解决：easyCode rollout 与 pong 实体谁是真源？**
E §10.7 说"真相在 easyCode 的 `EASYCODE_HOME`，宿主只缓存"；S §5.3 说会话/审批/事件落库"复用/新建 pong 实体"；D §5.3 又说"UI 可以丢，事件不能丢"，先写 pong SQLite。
三处对同一事实给了三个真源。启动时谁对账、差集怎么处理、用户在 easyCode TUI 里改过的会话怎么办——全部缺失。**这是数据一致性 blocker，不是实现细节**；必须在 ADR 里写死"单一写者 + 单向投影"。

**S7（minor）"复用 InstanceAiEvent 形状"与"复用 AgentChatPanel"互相矛盾。**
`InstanceAiEvent` 有 reducer 与 durable 游标（`event-bus.interface.ts:5-20`），Agents SSE 没有（S §3.6 自己也列了）。如果 easyCode 事件走 InstanceAiEvent 形状，`AgentChatPanel` 就不能直接复用；如果走 AgentSseEvent，就丢掉回放。S 同时承诺两件事，说明前端方案还没定。

**S8（minor）"P0 一周 MCP 桥零改造"不成立。**
实测 V6 显示 pong 启动期就有 MCP registry 外联并超时失败。MCP 面在离线机上本来就不干净；P0 至少要处理 registry 外联、BYO-key、MCP 鉴权三件事，不是"零改造"。

### 1.3 `multi-agent-protocol-analysis.md`

**M1（blocker）协议没有排序字段，"以日志 seq 为准"把关键不变量外包给了存储层。**
M §3.8 说"同一 task 内以日志 `seq` 为准"，但 §3.3 的 Envelope 与 §6.1 的 `$defs/envelope` 里没有任何 `seq`/`lamport`/`log_offset` 字段，且 `sent_at` 明确"不用于排序"。点对点旁路（M §9 R4 的缓解）一旦启用就无法保序；重放只能靠黑板写入方补序，而黑板是 pong 的事件总线——等于协议层没有定义自己声称拥有的能力。
**可验证**：搜索 §6.1 envelope 的 `required` 列表，无排序字段。**改法**：envelope 增加 `log_seq`（由单一写者分配）或删掉 §3.8 的排序承诺。

**M2（blocker）状态机与消息集对不上，按文档写不出代码。**
§3.10 状态机有 `awaiting_input`（由 `request_user_input` 触发），但 §3.4/§6.1 的 13 种 `kind` 里没有 `request_user_input`/`user_input`；§3.8 定义了 `lease_expires_at` + 心跳租约，schema 里**没有该字段**；`progress_reported` 在 §3.4 写"期望回复：无（可忽略）"，却在 §3.8 被当作租约心跳。
这是"一次成型"的硬伤：M0 可以只做 3 种消息绕过，但那等于承认 §3.10 的状态机不成立。**改法**：要么删 "awaiting_input/lease"，要么补 `user_input_requested/user_input_provided` 与 lease 字段。

**M3（major）13 种消息里至少 8 种是既有能力的换名，判据是 M 自己的映射表。**
- `hello/hello_ack` ← `initialize/initialized` + `--version`（M §8.2 自己写了）
- `ack`/`duplicate` ← RPC response + `agent_message_queue.messageId` 唯一索引（M §8.2 引用）
- `progress_reported` ← `turn/started`、`item/*`、`tokenUsage`
- `approval_requested/decided` ← easyCode server request + pong `pendingConfirmation`
- `task_cancelled` ← `turn/interrupt`
- `artifact_published` ← `fileChange`/`commandExecution` item + pong `binary_data`/`agent_files`
- `conclusion_proposed` ← `outputSchema` + `turn/completed`
- `error_reported` ← `error{willRetry}`/`turn/failed`
真正新增的只有 `conclusion_challenged` 与 `arbitration_verdict`（M §8.2 自认"无原生对应"）。**结论**：这不是"多 agent 协议"，而是"给 2 条新语义套了 13 种信封"。M §0.5 的指标（p50 ≤2KB、token ↓60%）没有一条是"消息种类数"带来的。

**M4（major）信封版本字段设计会让旧日志永远无法解析。**
`$defs/envelope.protocol` 是 `{"const":"pong.agent/0.1"}`。协议一升级（0.2），所有历史日志与回放校验直接失败；M §9 R3 说要"日志保留原始字节 + 解析版本号"，但 schema 的 `const` 与之矛盾。
**改法**：`protocol` 用 pattern/enum，版本协商落在 `hello`；或按日志段保存 schema 快照。

**M5（major）把未验证的收益写进 TL;DR。**
M §0.5 写"handoff 输入 token 降低 ≥60%"、§7.7 给成本表，但同页自己标注"待验证假设"；验收第 9 条才做 A/B。这是决策报告的最坏形态：**用假设当卖点**。应在 M0 前做一次单任务 A/B（同一任务，自然语言 vs 协议），否则不立项。

**M6（major）验证闭环依赖一个没验证的前提：easyCode 的 collab 工具能否从 app-server 外部驱动。**
M §11 开放问题 3 自认未验证。若不能，verifier/arbiter 只能由 pong 另起模型调用——那是在 easyCode 之外再养一条 LLM 调用链，成本、限流、模型一致性全没算；而且与"verifier 不能是 producer"的同源偏差缓解冲突（同一家模型、同一网关）。

**M7（minor）"协议只传事实"与三处自由文本共存，脱敏责任未落地。**
`notes` ≤2KB、`rationale` ≤600、`summary` ≤400 都会进模型上下文；M §3.6 要求"摘要发布前脱敏"，但没写由谁在哪个进程做（pong 的 `@pong/utils` redaction 目前用于日志）。artifact 可能含用户代码/凭据，这条不落地就是数据出境面。

**M8（minor）兼容性 CI 是空话。**
M §3.5/§11 要求"旧 schema 校验新样例 + 新 schema 校验旧样例"的 CI，但实测 `pong-studio/.github` 不存在（V9），桌面文档还打算从零建 `desktop.yml`。先把 CI 建起来，再写"CI 保证"。

### 1.4 `desktop-runtime-analysis.md`

**D1（blocker）"必须 release profile、CI 断言 easycode.exe < 150MB"与"CI 从固定 URL 下载、不在本地编译"直接矛盾。**
D §7.3 写"取 easyCode（CI 从固定 URL 下载并校验 sha256；不在 Windows 本地编译全量 Rust）"；但 §1.1/§3.1/R2 要求 release profile（`lto=thin`/`strip`/`panic=abort`）与 150MB 门禁；§7.4 的 `runtime.lock.json.easycode.url` 是 `https://<release>/...` 占位符。
事实：本机只有 `dev-small` 的 344.2MB 可执行文件（`dist/.../README.txt` 自述 "Package profile: dev-small"），fork 自己的 release artifact 尚不存在。**你无法给一个你下载的二进制改编译 profile。**
**改法**：先回答"release 二进制由谁产出"（自建 Windows CI 编译 easyCode，或要求上游 release 作为合同），否则删掉 `<150MB` 门禁，把 M2 打包里程碑改为"以 dev-small 交付 = 安装包 500–650MB 可接受"的显式决策。

**D2（blocker）安装布局与 requiredFiles 写错了，冒烟矩阵必挂。**
D §3.1 与 §7.4 写 `bin/easycode-command-runner.exe`；实测产物在 `easycode-resources/easycode-command-runner.exe`，`bin/` 只有 `easycode.exe`、`easycode-code-mode-host.exe`、`easycode-computer-use.exe`，`rg.exe` 在 `easycode-path/`。
`runtime.lock.json.requiredFiles` 与 `verify-runtime` 会永远报缺文件。**改法**：按实测路径修正，并把 `--self-test` 写成"文件存在 + `initialize` 往返 + `version` 一致"三件事。

**D3（major）Job Object 被当成"唯一可靠兜底"，但三个真实场景没有分支。**
1. 壳已在父 Job 内（CI、企业启动器、某些终端）：`IsProcessInJob` 只提一句，没有失败告警与降级；
2. 子进程 breakaway：easyCode 会拉起 `code-mode-host`/`command-runner`/`rg`，若其中任一用 `CREATE_BREAKAWAY_FROM_JOB`/`DETACHED_PROCESS` 就逃逸（文档未审计过 easyCode 的 spawn flags）；
3. **关窗即 job kill**：D §2.4 写"关窗=退出"，但 §4.7 的优雅退出依赖"先 POST /internal/shutdown → pong flush → 关 easyCode stdin"。用户点关闭时若壳先关 job handle，pong 被 `TerminateProcess`，SQLite WAL 不 checkpoint、easyCode 半写 rollout——正好命中 D §5.4 的"断电/SQLite 损坏"和 E §12 未验证项 4。
**改法**：把"关窗 → shutdown → 等待 ≤15s → 关 job"写成强制时序并加测试；job kill 只作崩溃兜底。

**D4（major）4 个 app-server 共享一个 EASYCODE_HOME 的 SQLite 竞争没有分析。**
实测 `~/.easycode` 有 `state_5.sqlite`、`thread_history_1.sqlite`（109.8MB）、`logs_2.sqlite`（60.6MB）、`.sqlite-maintenance.lock`、`thread-writer-locks/`；代码侧：`state/src/sqlite.rs:45-46` 定义这两个 DB 文件名，`rollout/src/writer_lock.rs:17`（`thread-writer-locks`）、`state/src/runtime/reclamation.rs:124`（`.sqlite-maintenance.lock`）、`app-server/src/lib.rs:663`（`init_sqlite_state_db_with_fresh_start_on_corruption`）。
D §4.8 的池化（最多 4 常驻、同 key 复用 thread）意味着 4 个进程同时打开/迁移同一批 DB，且同一 thread 跨进程 `resume` 依赖 writer lock——**文档把这个风险完全留白**。同时 easyCode 侧的 rollout/logs 保留策略没有（pong 只裁剪自己的事件表），110MB 的 thread history 会继续长。
**改法**：M0 实测 4 进程并发 start/resume；要么每进程独立 home（磁盘 ×N），要么单 daemon 多 thread；并给 easyCode 侧加清理任务。

**D5（major）否决方案 C（本地 Web + 启动器）的两条理据不成立。**
D §2.5 说"浏览器标签页做不到阻塞式审批"——审批是页面内模态 UI，阻塞是交互模式，不是 OS 能力；pong 现有 `pendingConfirmation` + SSE 已经证明可以做到"必须应答才能继续"。"没有应用身份（窗口/托盘/深链）"可以用 <2MB 原生启动器 + 快捷方式部分解决；文件选择器可以用 pong 自己的路径输入 + 校验替代。
C 的真实代价只是"浏览器标签页不受控"，收益是：去掉 Rust/MSVC/WebView2/Tauri updater 全套工具链，安装包从 ~1GB 降到 ~530MB。**判断（无代码证据）**：对一个"本地单用户编码 agent"的第一版，C 的性价比明显更高；Tauri 应作为 M2 之后的包装选项，而不是 §2 就定案。

**D6（major）三条更简单的路径被忽略。**
1. `easycode app` 与 `remote-control start/pair`（V4 实测）：easyCode 自己已提供桌面启动器与带配对码的受控远程面；哪怕不用，也该在 M0 对比"pong 只做 ws+token 客户端"与"pong 自建 N 个 stdio 子进程"的成本。
2. `app-server daemon` + `proxy --sock`：一个常驻 daemon 托管所有 thread，pong 只 spawn 一个瘦 proxy 做 stdio 桥，或直连 daemon 的受控 socket。D §4.8 用一句"引入第二套生命周期"否决，但没算"每 agent 一进程"带来的内存、SQLite 竞争、Job 树规模。
3. 打包：仓库已有 `scripts/build-pong.mjs`（741 行，`pnpm deploy --prod` 输出 `compiled/`）与 `docker/images/engine/Dockerfile`（`COPY ./compiled`，Node `24.22.2`），D 却要新写 `build-runtime.mjs`。**两套生产布局必然漂移**；桌面版应复用 `compiled/`，只补"node.exe + easycode + 启动器"。

**D7（major）首启引导新增两条认证旁路，却没有纳入威胁模型。**
D §3.4 的 `GET /rest/bootstrap?token=`（60s、loopback）与 §4.7 的 `POST /internal/shutdown`（loopback + bearer）是新的 HTTP 面；token 在 URL 里会进 referer/历史/日志/崩溃包。§6.1 还宣称"只开两个口"，§6.5 的"绝不能放弃"里也没有这两条。
另外 `PONG_SECURE_COOKIE=false` 下会话 cookie 在同机任意进程面前等同明文。**改法**：token 走 POST body/header、一次性 + 绑定窗口 Origin、日志 redaction 加断言；`/internal/shutdown` 用独立随机端口或命名管道。

**D8（major）启动期外联面被低估，env 基线不完整。**
实测 V6：启动期 MCP registry 的 Strapi 请求 6s 超时后 `A system task run failed`；日志还会打印 "Running pong outside a container is deprecated"。D §5.1 的 env 清单（沿用 `start-pong.ps1` 的 6 个）没有一项关掉这些 system task。**判断（无代码证据）**：首启 4–12s 里相当一部分是这些外联超时，而不是文档假设的 DB 迁移/DI。

**D9（minor）体积预算缺一个实测值：pong 生产运行时。**
D §1.1 已实测 cli dist 32.1MB、editor-ui 62.9MB、node 89.6MB；但 `compiled/` 在本机不存在（未构建），"pong runtime 400–900MB、安装包 300–450MB"是空估算，却已写成 CI 门禁（`<500MB`）。**先构建 `compiled/` 量一次，再写门禁。**

**D10（minor）`--strict-config` 是一颗启动炸弹。**
实测用户 `~/.easycode/config.toml` 里有 `windows.model_instructions_file`，当前版本报 "unrecognized configuration setting" 但继续运行；若按 D §3.5 启用 `--strict-config`，同类键会**直接阻断启动**。而文档把 `--strict-config` 当"防用户手改漂移"的银弹，没有配置迁移/降级路径。**改法**：先跑一次 `doctor` 迁移，或只在首启写入后校验、升级时自动备份+迁移。

**D11（minor）"薄壳"不薄。**
D §7.2 自己列了 `job/supervisor/port/shutdown/runtime_lock/secrets/onboarding/logs` 八个 Rust 模块 + `ui/` 独立 Vite 入口 + NSIS + 签名 + CI。D §2.4 用"团队已有 Rust 事实（easyCode 是 Rust）"来摊薄成本——但 easyCode 的 Rust 是别人的代码，团队有没有人能为 Job Object/WebView2/签名维护负责，文档没有证据。

### 1.5 跨文档冲突（这些冲突本身 = 必然返工）

| # | 冲突 | 出处 | 后果 |
|---|---|---|---|
| X1 | 进程模型：单进程多 thread vs 每 agent 一进程 | E §10.1/§8.3 vs D §4.8 | 影响整个 supervisor/内存/SQLite 设计，二选一必须早定 |
| X2 | supervisor 归属：pong 拥有 vs 移入桌面壳 | S §5.8 P3 vs D §4.2 | 阶段 3 必然重写生命周期与所有权 |
| X3 | 包布局：`@pong/easycode-runtime`+`modules/easycode`+`features/easycode` vs `@pong/easycode-bridge`+`desktop-shell` | S §5.8 vs D §7.2 | 至少一个包/模块要改名或重建，CI 边界也要重写 |
| X4 | 数据真源：easyCode EASYCODE_HOME vs pong 实体 | E §10.7 vs S §5.3/D §5.3 | 对账逻辑缺失，用户会遇到"两边历史不一致" |
| X5 | 会话模型：不新造 vs 新 module+feature+HTTP 面 | S §6.5 vs S §5.8 | 同一份文档自相矛盾，落地必返工 |
| X6 | 黑板：pong 为真源 vs easyCode message board 旁路 | M §4.1 vs M §11 开放问题 2 | 两套黑板、两套订阅/游标 |
| X7 | 排期：S 的 P0–P3（6–8 周）与 D 的 M0–M4、E 的 P0–P6 没有合并图 | S §5.8/D §10/E §13 | 无法回答"什么时候能用" |
| X8 | 安全基线：只开两个口 vs 新增 bootstrap/shutdown/引导期外联 | D §6.1 vs D §3.4/§4.7/§8 | 威胁模型不闭合 |

### 1.6 横切：性能与复杂度陷阱（按"会疼"的顺序）

| # | 陷阱 | 证据 | 后果 |
|---|---|---|---|
| P1 | 每个 agent 一个 344.2MB 进程，冷启动要重新 page-in + 过 Defender | V1/V5；D §4.8 每 agent 一进程、池上限 4 | 4 个并发 = 1.4GB 磁盘读放大；杀软实时扫描放大启动时延。**判断（无代码证据）**：这也是"用 daemon 多 thread"最实际的收益点，文档没算 |
| P2 | 出站队列 128 条就断连，且断连覆盖 server request | `transport/mod.rs:24`、`transport.rs:161-175` | 见 A1；宿主"先落库再推送"若不彻底异步，一次 GC/大事务就打断 turn |
| P3 | `MAX(seq)+1` 的写路径 + "单实例无并发写"的错误前提 | D §5.3 原文声称 pong 单实例无并发写；实测 `.pong-data/.pong/database.sqlite-wal` 存在（SQLite WAL，多线程异步写） | per-event 读改写会与 workflow 执行、审批、evaluations 争同一把写锁；应改为内存单调计数 + 唯一索引 |
| P4 | 748 个生成类型入库 + `git diff --exit-code` + 全仓 typecheck | V3；`pnpm agent:typecheck` 是全仓检查 | 每次 easyCode 升级 = 一次大 diff + 更慢的 CI；`knip`/`boundaries` 还要为生成物开豁免 |
| P5 | 多 agent"双写黑板 + 点对点"的写放大 | M §4.1（每个消息既走点对点又写黑板） | 2–5 agent 可以承受，但事件日志增长、回放与 GC 成本全压在 pong 单 SQLite 上；M 只给了延迟上限（200ms），没给写预算 |
| P6 | 4 个 app-server 各自开 easyCode 自己的 SQLite pool（state/thread_history/logs） | V7 + `state/src/sqlite.rs:45-46` | 句柄、WAL 文件、维护锁 ×4；磁盘增长没有 easyCode 侧保留策略（见 D4） |

### 1.7 横切：不可测试点（这些结论在 CI 里永远无法自动判定）

| # | 不可测的断言 | 出处 | 可执行的替代验证 |
|---|---|---|---|
| U1 | "审批请求无超时" | E §2.6/§9.2、M §3.8 | 起 turn → 不回应审批 → 观察 30min 的进程/turn 状态；记录为录放 fixture |
| U2 | "token 降 60%" | M §0.5/§7.7 | 同一任务的自然语言 vs 结构化 A/B，n≥5，报中位数与方差 |
| U3 | "工具层 80% 可复用" | S §4.2 | 任选 3 个工具做转换 PoC，统计转换行数/坑/审批归属 |
| U4 | "pong runtime 400–900MB、启动 4–12s" | D §1.1/§2.3/§9 | 先构建 `compiled/`（V9，本机不存在），再量体积与冷启动分布 |
| U5 | "WebView2 离线可用/SSE 正常" | D §7.5/§9 | 干净 Win10 LTSC VM + 断网 + 禁更新，跑首启与长连接 |
| U6 | "4 进程共享 EASYCODE_HOME 安全" | D §4.8 | 压测：4 进程同时首启/迁移/resume，检查锁错误与 DB 完整性 |
| U7 | "杀软误报率" | D R5 | 只能发布后测：签名构建 + Microsoft 报备；在此之前不应写成"已缓解" |

### 1.8 横切：安全漏洞（按可利用性）

| # | 漏洞 | 证据 | 影响 |
|---|---|---|---|
| W1 | 双执行面：easyCode 的动作受审批/沙箱约束，pong 的 dynamic tools 在 host 侧不受约束 | E §3.6；A4 | 模型可通过工具调用执行 pong 权限下的任意 workflow/DB/文件操作，绕开 easyCode 审批 |
| W2 | `thread/shellCommand` 无沙箱、无审批链 | `app-server-protocol/src/protocol/v2/thread.rs`（`ThreadShellCommandParams` 的 doc） | 任何拿到连接的代码路径都能以完整权限执行 shell；必须白名单外+运行时断言 |
| W3 | bootstrap/shutdown token 在 URL/loopback，本地任意进程可重放 | D §3.4/§4.7 | 拒绝服务、会话劫持；需 POST + 一次性 + Origin |
| W4 | "local-owner 默认拥有全部 scope / 可放弃 CSRF" | S §8.1、D §6.5 | 本机恶意页面（DNS rebinding/CSRF）与任意本地进程可当管理员；这个取舍需要 ADR 与浏览器安全边界测试，不能一句话放弃 |
| W5 | `EASYCODE_HOME` 含 `auth.json`/`installation_id`，与用户已有 easyCode 共享时会混凭据 | V7 | 密钥/身份标识可能进日志或备份；必须隔离 home + redaction 白名单 |

---

## 2. 重点攻击（必须回答）

### (a) app-server 方案在"多 agent 并发 + 审批接管 + 崩溃恢复"下的具体失败模式

我按触发概率与破坏力排序，给 9 条。前 3 条是我认为最难在生产里发现的。

**A1（blocker）慢消费者断开 + 审批无超时 = 永久挂死，且无信号。**
证据链：出站队列容量 **128**（`app-server-transport/src/transport/mod.rs:24`）；`transport.rs:161-175` 对**所有出站消息**（含 server→client request）走 `try_send`，队列满即 `disconnect_connection`；断连后投递打印 `dropping message for disconnected connection`（`transport.rs:147-150`）；全仓无 `approval_timeout`（V8）。
组合后果：pong 读循环只要有一次同步写库/推送/GC 停顿超过 128 条消息的窗口（`item/agentMessage/delta` 一次 turn 轻松上千条），连接被断开；此后 easyCode 发出的审批请求被丢弃，turn 永远等一个不会来的 response；easyCode 侧没有超时。UI 看到的是"agent 卡住"，日志里只有一条 warn。
文档把"慢消费者断开"（E §9.2）与"审批无超时"（E §2.6）当两个风险，**没有相乘**。缓解不是"有界队列 + 丢弃策略"（E §9.2 的建议），而是：读循环里禁止任何 await；内部用无界队列；对每条 server request 记录 pending 并要求 turn 级别超时。

**A2（blocker）interrupt 竞态会被误判成"卡死"，触发错误的重建进程。**
`turn_processor.rs:1645-1649`：当 `active_turn_id` 为空且 `last_terminal_turn_id == turn_id` 或 agent 不在 Running 时，返回 `invalid_request("no active turn to interrupt")`。
场景：用户点"停止"的同一瞬间 turn 正常完成。宿主如果按 E §10.5/D §5.2 的"5s 无 TurnAborted 就重建进程"，会把一个已完成的 turn 当成卡死，杀掉进程，连带其他 thread。**必须把该错误当"已结束"处理**，并且重建进程只对"有 active turn 但 5s 无响应"生效。

**A3（blocker）审批的"连接内应答"语义与"事件先落库再推送"直接冲突。**
审批请求是连接级 server request：客户端必须在**同一连接**上回应，否则 turn 挂住；连接断开后该 request 不复存在。而 D §5.3 要求"事件先写 SQLite 再 push"、前端可断线重连。**重连后无法回应一个已断开的 request**——只能把它标成"未知结果"并要求用户重新发起 turn，或者把 SDK 层设计成"宿主进程 = 唯一连接，前端断开不影响宿主"。
E §10.7 只写"必须总有响应"，完全没有覆盖"宿主在等待用户点击时崩溃/重启"以及"UI 只是宿主的一个消费者"。**这是审批接管方案里最大的未定义语义**，必须在契约里写死：审批的应答责任在宿主进程，用户态重启 = 该 turn 作废。

**A4（major）审批覆盖是分裂的：easyCode 的审批只管 easyCode 的动作，pong 的 dynamic tools 在 host 侧执行，不受 easyCode 沙箱与审批约束。**
E §3.6 把 `thread/start.dynamicTools` 称为"pong 最关键的抓手"，但 `item/tool/call` 是**服务端请客户端执行**：pong 用自己的权限执行 workflow/DB/文件操作，easyCode 的 `sandboxPolicy`/`approvalsReviewer` 完全不适用。结果是两套执行面、两套授权域、两套审计。
D §6.3 只写了"命令审批"，没有写 pong 工具的审批归属。**改法**：dynamic tool 的审批/审计必须显式复用 pong 的 `AgentToolApprovalService`/`agent_thread_grants`，并在 UI 上与 easyCode 审批分开呈现。

**A5（major）崩溃恢复只恢复历史，不恢复"半执行"副作用。**
E §10.5 与 D §5.4 都说"未完成 turn 需重新发起"，M §3.9 承认"取消不是回滚"。但编码 agent 的典型崩溃点是"patch 写了一半 / 命令执行了一半"；`thread/resume` 之后模型看到的历史是 rollout 里的半条 item（E §12 未验证项 4）。
**必须规定**：resume 前做 workspace 一致性检查（git status/diff），UI 标"可能半改"，并且默认不自动重跑有副作用的 turn。

**A6（major）dynamic tools 被持久化进 session meta，导致"工具集版本"成为 resume 契约的一部分。**
E §3.6 引 `protocol.rs:3306-3309`：dynamic tools 在 thread start 时定义并持久化。如果 pong 升级后工具描述/参数变了，resume 老 thread 会带着旧工具定义跑，或者被服务端拒绝。文档没有任何"工具集版本 + thread 版本"契约。**改法**：thread 记录 toolset_hash，版本不匹配就 fork 新 thread。

**A7（major）并发审批没有归并键。**
E §10.4 的审批契约只按 `method` 路由到 UI。多 agent 场景下同一用户会同时收到多条审批：必须用 `(threadId, turnId, itemId, approvalId)` 去重/归并，否则"本次会话都允许"的语义会串到别的 agent。easyCode 的 `acceptForSession` 作用域是 thread 还是全局，文档没写清楚（`v2/item.rs` 的 decision 语义需要实测）。

**A8（major）10 分钟空闲回收与审批等待冲突。**
D §4.8 的池子"空闲 10 分钟回收"，但 A1 的场景里 turn 可能因为等审批而长时间没有任何事件（L4 ">120s 无事件不杀"）。如果回收逻辑看的是"无事件"而不是"无 active turn"，会杀掉正在等审批的进程。**回收条件必须读 thread 状态，不能读事件活跃度。**

**A9（minor）进程退出语义分叉。**
E §10.5 写"会话结束不强制 interrupt，等 turn/completed"；D §2.4 写"关窗=退出"；D §4.7 写"关 stdin → 5s → TerminateProcess"。三处对"用户关窗时正在跑的 turn"给出三种行为。必须统一为：关窗 = 先 `turn/interrupt`（或 shutdown 协议）→ 等终态 → 关 stdin。

**宿主自研 TS 客户端的维护成本是否被低估？——是，至少 2×。**
量化：Python 参考实现 1313 行（实测）；E 自列 8 个模块；必须覆盖 4630 行方法表里的白名单子集、100+ 通知、748 个生成类型、无版本协商、`strip_experimental_fields` 这类按 `experimentalApi` 改字段形状的行为（`transport.rs:181-203`）。
持续成本不是"写完 1.5k 行"，而是：每次 easyCode 升级都要重生成 748 文件 + diff + 回归 8 个契约测试；上游行为变化（例如新的审批字段、新的 item 类型）会静默出现在 UI 里。**判断（无代码证据）**：这不是一个"包"，是一个需要专人维护的适配层，且和 easyCode 的发布节奏强耦合。COTS 替代方案（daemon+proxy、ws+token）会显著降低这部分成本，应该在 M0 先试。

### (b) 多 agent 协议是不是"换皮 JSON"？

**结论：主体是，但有两个真需求。** 证据如下，不用形容词。

1. **M 自己的映射表就是证据**：§8.2 把 13 种 `kind` 逐条映射回 easyCode 的 `initialize`、`thread/start`、`turn/start`、`turn/completed`、`item/*`、server requests、`turn/interrupt`，以及 pong 的 `agent_message_queue`、`instance_ai_events`、`agent_file_grants`。**能逐条映射回已有载体，说明它没有引入新的执行能力。**
2. **M 自己承认只需 3 种**（§9 R1 缓解："只先做 3 种消息"）。如果 3 种覆盖 80% 价值，13 种就是过度设计。
3. **协议无法表达自己状态机要求的东西**：无 `seq`（M1）、无 `user_input`（M2）、无 `lease` 字段（M2）。这不是"草案不完整"，是设计层漏了。
4. **没有消费者**：没有 UI 设计（challenge/verdict 只对应"另一条 timeline 事件"？）、没有存储设计、没有 eval 设计；M §11 的开放问题（artifact 存哪、黑板主从、collab 能否外部驱动）全部未答，任何一条都能让实现停摆。
5. **收益全未验证**：token ↓60%（M5）、p50 ≤2KB（M §0.5）、"质疑→修订闭环 ≥80%"（M §11），没有一条有实测，却写进 TL;DR。

**哪些消息可以被现有工具/工件直接替代（建议删）：**

| 协议消息 | 替代物 | 处理 |
|---|---|---|
| `hello`/`hello_ack` | `initialize/initialized` + `easycode --version`/`app-server daemon version` + pong 的 schema 快照 diff | 删，写进适配器启动自检 |
| `ack`（含 duplicate） | RPC response + `agent_message_queue.messageId` 唯一索引（已有） | 删，幂等由 DB 唯一索引保证 |
| `progress_reported` | `turn/started`、`item/*`、`thread/tokenUsage/updated` | 删，直接映射为 UI 事件 |
| `approval_requested/decided` | easyCode server request + `instance_ai_pending_confirmation`/`AgentToolApprovalService`/`agent_thread_grants` | 删，只做字段映射 |
| `task_cancelled` | `turn/interrupt` + `Op::Interrupt` | 删，复用现有 |
| `error_reported` | `error{willRetry}` / `turn/failed` + pong 错误码映射 | 删，做映射表 |
| `artifact_published` | `fileChange`/`commandExecution` item + `binary_data`/`agent_files`/`agent_file_grants`（已有表） | 保留"内容寻址 + manifest"这一个概念，不新增消息类型 |
| `conclusion_proposed` | `turn/start.outputSchema` + `turn/completed` | 保留（真需求：结构化交付声明） |
| `conclusion_challenged`、`arbitration_verdict` | 无现有载体 | **保留，但排到 M2**（真需求：可验证闭环） |

**判断**：给 M 的定位应当是"两个新语义 + 一个 artifact 引用规范"，而不是"一套协议"。把它包装成 13 种消息、双向版本协商、双层黑板，会让团队把时间花在 schema 与仲裁引擎上，而"本地能跑"这个真正的风险（R1、D4、A1）没人处理。

### (c) Tauri 薄壳 + Node sidecar + 344MB easycode.exe 在 Windows 上真的可行吗？

**分项结论：**

| 维度 | 判定 | 依据 |
|---|---|---|
| 二进制能跑 | **可行**（已实测） | V1/V2：原生 Windows 起得来、initialize 成功；E §12/D §0 的"Windows 原生不成熟"应改为"具体子系统未验证" |
| 体积 | **有条件** | dev-small 344.2MB + 520.2MB portable 实测；release 来源未定（D1）。安装后 ~0.9–1.4GB 的估算是可信的，但 150MB 门禁不可信 |
| 首启 | **可行但慢** | 启动期 MCP registry 6s 超时会叠加；真正的首启瓶颈是 DB 迁移/节点加载，文档没实测（D9） |
| 杀软 | **高风险** | 未签名 344MB Rust 二进制 + 拉起 node/cmd/powershell，SmartScreen/启发式误报概率高；D 只有"Authenticode + 报备"一句，这是发布前的长尾工作，不是 checklist |
| Job Object | **可行，但文档的时序是错的** | 关窗先关 job = 强杀 pong（D3）；需要"shutdown → 等 → 关 job"的强制时序 |
| WebView2 | **有条件** | Win10 LTSC/离线机缺失风险真实存在；D 只给"bootstrapper（要网络）/离线包"二选一，没有选型 |
| 简化路径 | **被忽略** | 见下 |

**被忽略的更简单路径（按推荐顺序）：**
1. **C 方案先行**：浏览器 + 现有 `start-pong.ps1` + 一个小启动器（单实例锁 + 托盘/快捷方式 + 生产 `compiled/` 布局）。1 周可交付，安装包约 530MB+node，无 Rust/MSVC/WebView2/签名工具链。D5 的否决理由不成立。等用户真的抱怨"没有应用身份"再加壳。
2. **easyCode 既有 daemon/proxy/remote-control**（V4）：一个常驻 daemon + 多连接消费 + 内置 capability-token 鉴权，省掉"每 agent 一进程 + 自研 748 类型客户端 + 进程池"的大部分复杂度；至少应在 M0 与 stdio 方案对照。
3. **复用现有生产布局**（V9）：`scripts/build-pong.mjs` → `compiled/`，Docker engine 已证明这条路径可用；桌面打包只需加 `node.exe` + easyCode + 启动器，不需要新写 `build-runtime.mjs`。

**判断**：D 的"两个最大风险"定位错了——easyCode 的 Windows 原生不是最大风险（V2 已证明能跑）；真正会失败的是**关窗强杀的数据一致性、easyCode 自身 SQLite 竞争、无 release 二进制、未签名大二进制的分发**。把"R1 easyCode Windows 不成熟"从 blocker 降为 major，把 D3/D4 升为 blocker。

### (d) pong 已有 `@pong/agents` 基座与执行链路，easyCode 接入是否真的需要新包 + 新模块 + 新前端？

**结论：不需要，至少不是第一步。** 文档的"新包 + 新模块 + 新前端"是它自己"收敛"论点的反面。

**证据 1：执行层已经有可插拔边界。** `AgentTurnExecutionService.execute` 只依赖 `config.prepare()` 返回 `AgentTurnRequest`，然后 `yield* streamTurn(...)` 产出 `StreamChunk`（`agent-turn-execution.service.ts:141-200`）。easyCode 完全可以作为另一种"turn 生产者"接在这个边界后面：`prepare` 里 `thread/start`，`streamTurn` 里把 easyCode 通知翻译成 `StreamChunk`/`AgentSseEvent`。已经存在的 `createRecorder`、`settleTurn`、`messageQueue.settle`、`sandboxFiles.trackRun` 全部复用。

**证据 2：事件映射目标已经存在。** `agent-sse-stream.ts:241-316` 已有 `emitChunkEvents`（text/reasoning/tool/usage/finish/subagent），`@pong/api-types` 有 `InstanceAiEvent` + reducer（S §3.6 自己也引了）。新增的只是"easyCode item → AgentSseEvent"一张映射表。

**证据 3：持久化与审批实体已经存在。** `agent_thread`/`agent_message`/`agent_execution`/`agent_plan`/`agent_checkpoints`/`agent_thread_grants`/`agent_file_grants` 都在（`agents.module.ts:264-358`，35 个实体；审批挂起落在 checkpoint、session 允许落在 `agent_thread_grants`，见 `agent-tool-approval.service.ts:44-56`）。easyCode 的 thread/turn/approval/artifact 都有落点；不需要新表，只需要 runtime_kind 字段与两三个映射表。

**证据 4：新前端 = 第 5 套会话模型，正是 S 自己禁止的事。** S §6.5 写"不要新造平行模型"，§5.8 却要 `features/easycode` + `/easycode/sessions` + 新路由。实测 `features/agents` 已 659 文件/190 组件，再复制一套就是永久的双维护。

**最小改动方案（建议替代 S §5.8/D §7.2）：**
```
modules/agents/
  runtimes/
    easycode/
      adapter.ts          # app-server 客户端（协议层，可独立成包）
      turn-producer.ts    # prepare(turn/start) + streamTurn(通知→StreamChunk)
      approval-bridge.ts  # server request ↔ agent_thread_grants / checkpoints
      artifact-bridge.ts  # fileChange/diff → agent_files/binary_data
```
+ `agent_thread.runtime_kind = 'easycode'` + 一次数据库迁移 + `AgentSseEvent` 的 item 类型扩展。
不新增 cli module、不新增 HTTP 面（复用 `agent-chat.controller.ts` 的 v2 路由）、不新增 frontend feature（复用现有会话页 + runtime 徽标）。

**最不可信的"改动量"（点名）：**
1. **S §5.8 P1 "3-4 周"**：实测 727 文件/35 实体的既有模块 + 659 文件/190 组件的前端，A(1.5-3k)+B(4-8k) 行只能算"协议层 + 映射层"，不含实体迁移/审批 UI/审查回归；**判断：至少 8–12 周。**
2. **S §4.2 "工具层 80% 可直接复用"**：S2 已反驳；这个比例没有任何 PoC 支撑，且 dynamic tool 的审批/沙箱归属未定。
3. **S §5.8 P2 "2-3 周"前端**：在一个 190 组件的既有 feature 旁边新建会话 UI + 审批收件箱 + 产物面板，2–3 周只能做出 demo。
4. **D §4.8 "每 app-server 150–400MB"**：label 是估算；实测 easyCode 启动即加载 344MB 二进制并带自己的 SQLite，4 并发 + pong + WebView2 的 1.5–2.5GB 只是乐观下界。

### (e) "不硬编码提示词"的承诺是否被暗地里违背？

**结论：被违背，而且是被每一份文档分别违背。** 这不是措辞问题：模型的全部行为来自"注入文本"，把字符串从代码搬进配置/文件/字段，不叫不硬编码。

证据（逐条）：
1. E §10.2 的 `thread/start` 示例直接给出 `developerInstructions` 的用途："业务身份、输出格式、必须请求审批的动作"——这就是一段业务提示词。
2. E §7.1 #10 建议用 `collaborationMode.settings.developerInstructions` 承载"pong 的 plan/默认模式"——又一段。
3. E §3.3 把 `$EASYCODE_HOME/AGENTS.md` 当"天然外部化通道"；D §3.5 会由壳生成 `config.toml`。**宿主写文件就是硬编码，只是换了个位置。**
4. E §3.6 的 dynamic tool `description` 是"模型据此选工具"的依据——工具描述就是提示词。
5. S §6.4 "选中节点/子图 → 以 `developerInstructions` 注入上下文（节点类型、参数、表达式、选中范围）"——每次调用注入一段模板。
6. M §8.2 `task_assigned` 的映射规则是"任务规格渲染器：goal/acceptance/budget → **稳定模板文本**"——这就是 prompt template，而且它决定了所有 agent 的输入分布。
7. M §5.3 把协议消息包装成工具（`send_task_assignment` 等），这些工具的 schema + description 是又一层提示词。
8. 已存在的反例：`instance-ai.adapter.service.ts:1059-1077` 的 `buildLicenseHints()` 把"Pro plan"文案注入模型上下文（我核对了 1063 行）；删掉它只是第一步。
9. 实测 V7：用户 `~/.easycode/config.toml` 里存在 `windows.model_instructions_file`——**提示词注入在 easyCode 侧至少有 config file / instructions 文件 / `developer_instructions` 三个通道，且会随版本静默失效**。

**为什么这直接威胁"一次成型"：** 这些注入文本决定 agent 是否请求审批、是否使用工具、是否输出结构化结论。一旦它们散落在 4 个文档、3 个仓库位置、2 种语言（TS/TOML/Markdown）里，**任何行为调优都要改多处**，而 prompt cache 前缀（E §3.7：base instructions 被 hash 成 prefix UUID）会因为每次注入不同内容而失效，成本和延迟双升。

**要达到承诺，必须给出可执行定义（否则这句话不可验收）：**
- 所有 host 注入文本进入 `prompts/` 数据目录，带 `prompt_id + version + sha256`；
- 每段注入有 eval 基线（同一任务前后对比），变更走 review；
- CI 禁止在业务代码里出现长字符串提示词（lint/规则）；
- UI 提供"当前会话注入了什么"的审查视图（用户可查、可关）；
- easyCode 侧只允许一个注入文件（`$EASYCODE_HOME/AGENTS.md`），启动时对 `config.toml` 做键白名单校验并拒绝 `model_instructions_file` 类键。

**附带：** "不限制模型"同样被方案本身违背。easyCode 的主路径按 Responses API 建模（E §9.2 自认 `wire_api=chat` 未验证，E §12 #2），base prompt 与工具契约面向 OpenAI 风格；选 easyCode = 选择"能理解 Codex 工具/patch/reasoning 契约"的模型。要兑现"不限模型"，M0 必须用两个非 OpenAI 端点（DeepSeek/GLM/Ollama）跑通 P1–P4，失败就把 easyCode 定位为"OpenAI 兼容模型专用"并在产品上写清，而不是继续宣称不限模型。

---

## 3. 必须改清单（20 条，可执行）

> 每条都有验收物；1–10 是 blocker 级，11–20 是 major 级。

| # | 动作 | 验收物 |
|---|---|---|
| 1 | 把"license 剥离"从 easyCode 前置 blocker 降级为独立任务；删除 `buildLicenseHints` 与套餐 UI/文案 | 离线首启日志无 license 相关报错；模型上下文无套餐文案 |
| 2 | 定集成拓扑：M0 对照三种（per-agent stdio / daemon+proxy / ws+capability-token），只留一条 | 一页 ADR + 三个 PoC 的启动/内存/多消费者结果 |
| 3 | 统一包边界：只保留一个 adapter 包（建议 `@pong/easycode-bridge`），删除 `easycode-runtime`、`modules/easycode`、`features/easycode` 三处命名 | 目录调整 PR；CI boundaries/knip 通过 |
| 4 | 确定 easyCode 二进制来源（自建 Windows CI 或上游 release 合同）与 SHA256 pin；未定前删除 `<150MB` 门禁 | `runtime.lock.json` 有真实 URL；`verify-runtime` 可跑 |
| 5 | 按实测修正安装布局：`easycode-resources/easycode-command-runner.exe`、`easycode-path/rg.exe` | `--self-test`：文件 + `initialize` + `version` 三项通过 |
| 6 | 定义并测试关窗/退出时序：`shutdown → flush/WAL checkpoint → 关 easyCode stdin → 关 job` | 在 turn 运行中关窗，断言 WAL checkpoint、rollout 无半条 item |
| 7 | 审批超时 + 断连语义落地：120s 超时→`decline`；宿主进程是应答责任方；UI 重连只展示不重发 | 单测：打满 128 队列 + 不回应审批，turn 在有界时间内结束 |
| 8 | 处理 interrupt 竞态：`no active turn to interrupt` 视为已结束，不重建进程 | 单测：turn 完成瞬间点停止，无进程重建、无报错弹窗 |
| 9 | 事件存储不用 `MAX(seq)+1`；per-thread 内存计数 + `(threadId, seq)` 唯一索引；明确与 workflow 执行共库的写预算 | 压测：2 个 turn + 1 个 workflow 并发写，p99 写延迟可接受 |
| 10 | 封死 easyCode 的隐藏提示词通道：`config.toml` 键白名单、拒绝 `model_instructions_file`、唯一注入文件 + sha256 | 启动自检拒绝未知键/未知指令文件；注入列表可在 UI 查看 |
| 11 | prompt-as-data：所有 host 注入集中到 `prompts/` + `prompt_id/version/hash` + eval；CI 禁止长字符串提示词 | lint 规则 + 3 个 eval 基线 |
| 12 | 模型自由度实测：`wire_api=chat` + DeepSeek/GLM/Ollama 跑 P1–P4；失败则收缩产品承诺 | 能力矩阵表（模型 × 工具/补丁/审批） |
| 13 | 协议砍到 4 种消息（`task_assigned`/`artifact_published`/`conclusion_proposed`/`conclusion_challenged`）+ envelope 补 `log_seq`；删 `awaiting_input`/lease 或补齐 | 用 ajv/Zod 校验 §7 全部示例通过 |
| 14 | 协议 M0 前做一次自然语言 vs 结构化单任务 A/B，实测 token/返工率 | A/B 报告；不达标则协议降级为"字段扩展" |
| 15 | 桌面先交付 C 方案（浏览器 + 启动器 + `compiled/`）作为 1 周基线；Tauri 作为 M2 可选包装 | 可安装、可卸载、单实例、离线可启动 |
| 16 | 复用 `scripts/build-pong.mjs` + `compiled/` + Docker engine 布局；不新写 build-runtime.mjs；先量体积再写门禁 | `compiled/` 体积实测 + 安装包实测 |
| 17 | 解决 EASYCODE_HOME 共享：单 daemon 多 thread 或每会话独立 home；禁止 4 进程同时首次迁移 | 4 进程并发 start/resume 测试通过，无 SQLite 锁错误 |
| 18 | 控制面安全：bootstrap/shutdown token 走 body/header、一次性、Origin 校验、日志 redaction；加 ADR | 安全用例：跨源失效、token 重放失效、日志无 token |
| 19 | 前端不新增 feature：复用 Agents 会话页 + runtime 徽标 + 审批收件箱；`rest-api-client` 只补一处 `api/agents.ts` | 无新路由；既有 e2e 通过 |
| 20 | 四份文档统一：包名/模块/拓扑/真源/排期各一版；每份加 `date + commit + 状态` 头；跨文档冲突表进 ADR | 文档 review 通过；冲突表清零 |

---

## 4. 可以保留清单

| # | 保留项 | 理由 |
|---|---|---|
| K1 | easyCode 作为"编码执行内核"（app-server 协议、thread/turn/resume/fork/steer/interrupt） | 这是真正不可替代的能力：本地 shell/patch/sandbox + 审批 + 流式，pong 自研不划算 |
| K2 | 保留 easyCode 的 base prompt、permissions/sandbox 文案、`apply_patch` 语法、guardian 策略 | E §7.2 判断正确：这些是行为契约，替换=重定义安全边界 |
| K3 | `approvalsReviewer=user` + `workspace-write` + `network_access=false` 的单用户基线 | 务实；auto_review 不能当安全边界（E §9.2 正确） |
| K4 | pong 的 `@pong/agents`/Agents 产品线继续作为非编码 agent 的主运行时 | 已有 727 文件/35 实体/工具/记忆/计划/审批，替换成本远高于收益 |
| K5 | 现有 3 条对话链路 + AI Agent 节点"并存 + 单向依赖"（S §7.2） | 方向正确；先收敛入口，但不要为 easyCode 再造一条 |
| K6 | artifact 内容寻址 + 不可变 + `parents[]` + 被结论引用的不 GC（M §3.6） | 这是 M 文档里最有长期价值的部分，独立于 13 种消息 |
| K7 | claim/acceptance/verdict 的语义方向（M §4.4/§4.5） | 真需求：可验证交付；只是不该先包装成协议 |
| K8 | 事件先落库再推送、审批审计、redaction（D §5.3/§6.2/§6.3） | 正确的工程原则，保留并补 A1–A3 的缺口 |
| K9 | Job Object 作为崩溃兜底（D §4.7） | 思路正确；只需补"关窗时序"与父 Job/breakaway 分支 |
| K10 | runtime lock + SHA256 + schema 快照 diff + `daemon update` 禁用（D §7.4） | 版本耦合的正确态度；但前提是 release 来源先解决（#4） |

---

## 5. 如果我是 Lead

### 砍掉的三件事

**砍 1：multi-agent 协议的 v0（13 种消息 + 版本协商 + 仲裁）。**
理由：M 自己说只需 3 种；8/13 有现成载体；状态机与 schema 对不上；无消费者、无 UI、无存储、收益未实测。保留 `conclusion_proposed` + `conclusion_challenged` 两个语义，作为 `outputSchema` + 一条事件，不做协议。
**不砍的代价**：团队会把 6 周花在 schema、仲裁引擎、A/B 上，而 R1/D4/A1 三个真正的 blocker 无人处理。

**砍 2：新 cli module + 新 frontend feature + 新 HTTP 面（S §5.3/§5.8）。**
理由：727 文件/35 实体的 agents 模块已有执行与审批边界；659 文件/190 组件的前端已有会话 UI；新增就是第 5 套模型，且 S §6.5 自己禁止。改成"agents 的一个 runtime + 一张映射表 + 一次迁移"。
**不砍的代价**：永久双维护 + 两套 SSE/审批/事件模型 + UI 分叉。

**砍 3：Tauri 桌面壳（M2 之前砍掉，先用 C 方案）。**
理由：D5 的否决理由不成立；344MB 未签名 dev-small、release 来源未定、Job Object 关窗时序、WebView2 离线、杀软全都没有验证；而仓库已有 `compiled/` 生产布局 + `start-pong.ps1` 先例。先交付"能装、能跑、能卸载"的 C 方案，再决定是否加壳。
**不砍的代价**：把最不确定的桌面基础设施放在关键路径上，且带进 Rust/MSVC/NSIS/签名/更新的长尾维护。

### 保留的三件事

**保 1：easyCode 作为编码执行内核 + 审批/steer/resume 契约。**
这是唯一"换掉就没人能干活"的能力；也是"本地、单用户、Windows"场景下最缺的（pong 现在的本地执行面为零，S §5.1 判断正确）。

**保 2：pong 现有的 Agents/Assistant/ChatHub 基座与工具/工作流引擎。**
它们是产品差异化，不是负担；收敛入口不等于删功能。easyCode 只是给会话加一种 runtime，不是替换平台。

**保 3：Windows 进程治理 + 版本锁 + 事件落库/审计四件套。**
这是"一次成型"的真正含义：进程不会留僵尸、二进制不会漂移、事件不会丢、审批可追溯。保留这四个原则，其余都可以砍 scope。

### 立项闸门（如果我是 Lead 会写进任务）

1. 三拓扑 PoC（stdio / daemon+proxy / ws+token）跑通 `initialize → thread/start → turn/start → 审批 → interrupt → resume`，并给出启动时延/内存/多消费者结论 → 否则不立项。
2. 两个非 OpenAI 模型跑通至少 1 个真实编码任务 → 否则收缩"不限模型"承诺。
3. 4 进程共享 EASYCODE_HOME 的并发 start/resume 无 SQLite 错误 → 否则强制单 daemon 或独立 home。
4. 关窗/turn 运行中的强杀不产生半条 rollout、不丢 WAL → 否则不做桌面壳。
5. 协议只允许 4 种消息；多一种需要一次 ADR 评审。
6. prompt-as-data 的 lint + eval 落地后，才允许继续加注入文本。

---

## 6. 复核命令（给 Lead 的可复现清单）

```powershell
$ec = "C:\Users\NJHTR\IdeaProjects\easyCode"
$p  = "C:\Users\NJHTR\IdeaProjects\seekwd"

# 1. easyCode 能在 Windows 原生跑（V1/V2）
& "$ec\dist\easyCode-windows-x64-portable\bin\easycode.exe" --version
# 再以 ProcessStartInfo 写 stdin：{"id":1,"method":"initialize",...}\n{"method":"initialized"}\n

# 2. 生成类型数量（V3）
& "$ec\dist\easyCode-windows-x64-portable\bin\easycode.exe" app-server generate-ts --out "$env:TEMP\ec-ts"
(Get-ChildItem "$env:TEMP\ec-ts" -Recurse -File).Count   # 748

# 3. 体积（V5）
(Get-Item "$ec\dist\easyCode-windows-x64-portable\bin\easycode.exe").Length / 1MB   # 344.2

# 4. 出站队列与断连（V8 代码）
Select-String "$ec\easycode-rs\app-server-transport\src\transport\mod.rs" -Pattern "CHANNEL_CAPACITY"
Select-String "$ec\easycode-rs\app-server\src\transport.rs" -Pattern "disconnecting slow connection"

# 5. pong 已有生产布局（V9）
Get-Content "$p\pong-studio\scripts\build-pong.mjs" | Select-Object -First 20
Get-Content "$p\pong-studio\docker\images\engine\Dockerfile" | Select-Object -First 15

# 6. license 不是离线 blocker（V6）
Get-Content "$p\.logs\pong-server11.log" | Select-String "license SDK|Editor is now accessible|system task run failed"
```
