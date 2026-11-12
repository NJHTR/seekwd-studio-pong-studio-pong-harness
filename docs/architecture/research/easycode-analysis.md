# easyCode 深度能力与集成面分析（代码级）

> 目的：为「把 easyCode 当作 agent 内核、宿主为去 license 的 n8n 二开 pong-studio、Windows 本地单用户」提供事实依据。
> 仓库：`C:\Users\NJHTR\IdeaProjects\easyCode`（`easycode-rs/` Rust workspace、`easycode-cli/`、`sdk/python`、`sdk/typescript`、`docs/`）。
> 所有结论均可由「文件:行号」复核；未读到的部分明确标注为“未验证”，不做推测。
> 分析时间：2026-11；仓库版本自述为上游 fork（见 §1）。

---

## 0. 结论摘要（先给判断）

1. **easyCode 不是自研内核，而是 Codex（OpenAI codex-cli/codex-rs）的改名 fork**，并叠加了自研扩展（guardian 自审、dynamic tools、world-state 上下文、daemon、多环境/MCP 扩展等）。判断依据：`easycode-rs/` 的 crate 布局（`core/app-server/app-server-protocol/exec/execpolicy/tui/apply-patch/rmcp-client/windows-sandbox-rs`）与 codex-rs 一一对应；`app-server-protocol/src/protocol/common.rs` 的 `thread/*`、`turn/*`、`item/*` 方法表是 codex app-server 的方法表；`docs/exec.md`、`docs/sandbox.md` 已被替换成 3 行“见 codex 文档”的跳转桩（`docs/exec.md:1-3`、`docs/sandbox.md:1-3`），说明上游文档被剥离。
2. **唯一值得接的集成面是 `easycode app-server` 的 stdio JSON-RPC**（非 JSON-RPC 2.0，见 §2.2）。它同时提供：外部注入 base/developer 提示词、外部审批（approval）、外部工具执行（dynamic tools）、turn 中断、thread 恢复/fork、MCP 热装载、按 turn 覆盖 cwd/model/sandbox。
3. **`easycode exec --json` 明确拒绝所有交互式能力**：命令审批、文件变更审批、用户提问、dynamic tool 调用在 headless 下一律被 `reject_server_request`（`easycode-rs/exec/src/lib.rs:2086-2204`）。因此“子进程 CLI”只能作为“无人值守一次性任务”通道，**不能**作为 pong 的主 agent 通道。
4. **SDK 能力被高估**：TypeScript SDK 只是 `spawn("easycode", ["exec","--experimental-json"])` 的包装（`sdk/typescript/src/exec.ts:94-95`、`203-206`），没有任何审批/工具回调；Python SDK 才是完整的 app-server 客户端（`sdk/python/src/openai_easycode/client.py:214-256`），但仍是子进程 + 事件泵。
5. **系统提示词可以外部化，但不应整体替换**：注入点有三层（`thread/start.baseInstructions`、`developerInstructions`/`config.developer_instructions`、`config.model_instructions_file`），而内置 base prompt 是 186 行、面向 OpenAI 模型与内置工具契约的硬编码文件（`easycode-rs/protocol/src/prompts/base_instructions/default.md`，与 `easycode-rs/models-manager/prompt.md` 哈希完全相同）。整体替换会破坏“工具使用/沙箱/审批”的提示词契约，属于高风险操作。
6. **最大工程风险不是能力，而是协议稳定性**：app-server 没有协议版本号协商，只有 `initialize.capabilities.experimentalApi` 开关与方法名字符串；上游 Python SDK 自己都要靠「最低版本 0.151.0 + `generate-json-schema` 探测字段」来兜底（`sdk/python/src/openai_easycode/_runtime_requirements.py:13-64`）。因此必须**锁死 easyCode 二进制版本**并把协议当“外部不稳定 API”对待。

---

## 1. 代码事实基础

### 1.1 仓库与产物

| 事实 | 证据 |
| --- | --- |
| 单一 CLI 二进制 `easycode`，多子命令 | `easycode-rs/cli/src/main.rs:146`（`enum Subcommand`），子命令含 `Exec(160)`、`AppServer(178)`、`Mcp(172)`、`Apply(208)`、`Doctor(194)`、`Sandbox(197)`、`ExecServer(244)` 等 |
| Windows 便携产物是裸 exe 集合 | `dist/easyCode-windows-x64-portable/bin/`：`easycode.exe`、`easycode-code-mode-host.exe`、`easycode-computer-use.exe`、`rg.exe`；另有 `easyCode.cmd`、`easycode-path/` |
| 编译版本自述 `0.0.0`（真实版本来自构建期 stamp） | `easycode-rs/Cargo.toml:165`；`easycode-rs/build-info/src/lib.rs:1-40`（`BuildInfo` 从 `STABLE_GIT_COMMIT`/安装上下文解析） |
| 协议 schema 可导出为 JSON Schema 与 TS 类型 | `app-server-protocol/schema/json/*.json`（318 个文件）、`app-server-protocol/schema/typescript/*.ts`（748 个文件）；CLI 子命令 `GenerateTs`（`cli/src/main.rs:640`）、`GenerateJsonSchema`（`:643`） |

> 结论：pong 侧**不必手写协议类型**，可以直接从 `schema/typescript` 或 `generate-ts` 产物生成客户端；但这份 schema 属于“无版本号快照”，升级要重新生成并做 diff。

### 1.2 与上游 Codex 的关系（影响后续维护策略）

- base prompt 文本自述：“You are a coding agent running in the easyCode CLI... easyCode CLI is an open source project led by OpenAI.”（`protocol/src/prompts/base_instructions/default.md:1`）——**保留了大量 OpenAI 专属措辞**。
- 审批策略枚举注释、`GranularApprovalConfig`、`SandboxPolicy` 形状是 codex 的 `AskForApproval`/`SandboxPolicy`（`protocol/src/protocol.rs:1097-1231`）。
- `apply_patch` 工具使用 Lark 语法文件（`core/assets/tools/apply_patch.lark`），与 codex 的 `apply_patch` 语法一致。

> 含义：能力上限≈Codex + 若干自研扩展；维护成本≈跟踪上游 Codex 变更 + 自研扩展变更。**不要 fork 内核做长期定制**（见 §9）。

---

## 2. 进程模型

### 2.1 进程角色与入口

easyCode 是一个“多角色单二进制”（`arg0` 分发：`easycode-rs/arg0`，`app-server/src/main.rs:81` 用 `arg0_dispatch_or_else`），关键角色：

| 角色 | 入口 | 说明 |
| --- | --- | --- |
| 交互式 TUI | `easycode` 默认（`cli/src/main.rs` `tui`） | 桌面/终端用，不适合 pong |
| 非交互 exec | `easycode exec ...` | 内部**也是** app-server 的 in-process 客户端（见 §2.3） |
| app-server | `easycode app-server --listen <URL>` | 本报告推荐通道 |
| managed daemon | `easycode app-server daemon ...`（`cli/src/main.rs:634-687`） | 可安装/启停后台 app-server，`app-server-daemon/src/lib.rs:1` 自述“Managed app-server lifecycle” |
| 辅助进程 | `easycode-code-mode-host`、`easycode-computer-use`、`rg.exe`、linux/windows sandbox helper | 由主进程按需拉起 |

### 2.2 app-server 传输与 JSON-RPC 语义

| 事实 | 证据 |
| --- | --- |
| 传输：`stdio://`（默认）、`unix://`、`unix://PATH`、`ws://IP:PORT`、`off` | `app-server/src/main.rs:39-46`（`--listen` 的 doc comment 与 `AppServerTransport::DEFAULT_LISTEN_URL`） |
| **不是 JSON-RPC 2.0**：不发也不收 `"jsonrpc":"2.0"` | `app-server-protocol/src/rpc.rs:1-2` 原注释 |
| 消息四型：Request/Notification/Response/Error（untagged 枚举） | `rpc.rs:34-42` |
| Request 允许带 W3C trace context（可做链路追踪） | `rpc.rs:44-56`（`trace: Option<W3cTraceContext>`） |
| 错误体：`{code:i64, message:String, data?}` | `rpc.rs:81-88` |
| 每个连接有 RPC 准入门（初始化/鉴权/关闭） | `app-server/src/connection_rpc_gate.rs:1-60` |
| 慢消费者会被主动断开（出站队列满 → disconnect） | `app-server/src/transport.rs:161-179` |
| 支持按连接 opt-out 通知方法（`optOutNotificationMethods`） | `app-server-protocol/src/protocol/v1.rs:62-65`；过滤实现 `app-server/src/transport.rs:105-128` |
| 未开 experimental 能力的连接会收到“被裁剪”的审批参数 | `app-server/src/transport.rs:181-203`（`strip_experimental_fields`），字段见 `v2/item.rs:1604-1608` |

### 2.3 生命周期（一次会话的完整时序）

```
[spawn] easycode.exe app-server --listen stdio://
   │
   ├─→ client → initialize {clientInfo, capabilities}
   │      ← InitializeResponse {userAgent, easycodeHome, platformFamily, platformOs}
   │   client notify "initialized"                     ← 必须，否则后续请求被 gate
   │
   ├─→ thread/start {cwd, model, approvalPolicy, sandbox, baseInstructions, dynamicTools...}
   │      ← ThreadStartResponse {thread, model, modelProvider, cwd, instructionSources, sandbox...}
   │      ⇠ notifications: thread/started, ...
   │
   ├─→ turn/start {threadId, input:[{type:"text",text}], outputSchema?, ...}
   │      ← TurnStartResponse {turn}
   │      ⇠ turn/started
   │      ⇠ item/started / item/agentMessage/delta / item/reasoning/* / item/commandExecution/outputDelta ...
   │      ⇠ 服务端请求: item/commandExecution/requestApproval / item/fileChange/requestApproval /
   │                   item/tool/requestUserInput / item/tool/call / mcpServer/elicitation/request …
   │         client 必须回 response（否则 turn 挂住；仓库内未找到审批超时逻辑）
   │      ⇠ turn/completed {usage}（或 turn/failed）
   │
   ├─→ turn/interrupt {threadId, turnId}   （可选）
   │      ← 响应延迟到 TurnAborted 到达（见 2.6）
   │
   └─→ 连接关闭 / 进程退出（正在跑的 turn 连带终止；重启后靠 thread/resume 恢复）
```

证据：
- `initialize` 方法与 params/response：`app-server-protocol/src/protocol/common.rs:500-504`、`protocol/v1.rs:29-84`。
- 初始化只允许一次（二次返回 `Already initialized`）：`app-server/src/request_processors/initialize_processor.rs:134-146`。
- `initialized` 通知：in-process 客户端同样要发（`app-server/src/in_process.rs:403`）；Python SDK 在 `initialize()` 末尾 `self.notify("initialized", None)`（`sdk/python/src/openai_easycode/client.py:324`）。
- 多连接/广播模型：`app-server/src/transport.rs:205-244`（`Broadcast` 只发给已 initialized 的连接）。

### 2.4 方法表（集成面清单）

**客户端 → 服务端（节选，全部见 `common.rs` 宏表）**

| 方法 | 行号 | 用途 |
| --- | --- | --- |
| `initialize` | `common.rs:500` | 握手 |
| `thread/start` | `:552` | 建线程（cwd/model/sandbox/instructions/dynamicTools） |
| `thread/resume` / `thread/fork` | `:558` / `:564` | 续跑 / 分叉 |
| `thread/read`、`thread/list`、`thread/turns/list`、`thread/items/list` | `:858, :772, :869, :875` | 历史读取（可替代宿主自建历史） |
| `thread/archive` / `thread/delete` / `thread/unarchive` | `:570, :575, :729` | 生命周期 |
| `thread/compact/start` | `:734` | 手动压缩 |
| `thread/shellCommand` | `:739` | 线程内跑 shell（注意：注释说明它**不受线程沙箱约束**，见 `v2_all.py` 中的字段描述） |
| `thread/revert` | `:767` | 回滚 |
| `turn/start` | `:1057` | 发起一轮 |
| `turn/steer` | `:1069` | 对进行中的 turn 追加输入（带 `expectedTurnId` 前置条件） |
| `turn/interrupt` | `:1075` | 取消 |
| `review/start` | `:1122` | 内置 review 流程 |
| `config/read`、`config/value/write`、`config/batchWrite` | `:1431, :1456, :1462` | 读写配置（宿主可远程改模型/审批策略） |
| `model/list` | `:1128` | 模型目录 |
| `command/exec` / `command/exec/write` / `command/exec/terminate` | `:1378, :1385, :1391` | 旁路执行命令（独立于 agent 工具，可做宿主自己的工具实现） |
| `fs/readFile`、`fs/writeFile` … | `:997-1042` | 旁路文件操作 |
| `mcpServer` 刷新 | `:1252` | 热装载 MCP |
| `skills/list`、`plugin/*` | `:894, :924-1056` | 扩展面 |

**服务端 → 客户端（请求，必须回应）**

| 方法 | 行号 | 参数要点 |
| --- | --- | --- |
| `item/commandExecution/requestApproval` | `common.rs:1797` | `kind, threadId, turnId, itemId, startedAtMs, approvalId?, environmentId?, reason?, networkApprovalContext?, command?, cwd?, commandActions?, additionalPermissions?, proposedExecpolicyAmendment?, proposedNetworkPolicyAmendments?, availableDecisions?`（`v2/item.rs:1560-1622`） |
| `item/fileChange/requestApproval` | `:1804` | `threadId, turnId, itemId, startedAtMs, reason?, grantRoot?`（`v2/item.rs:1643-1657`） |
| `item/tool/requestUserInput` | `:1810` | 模型向用户提问 |
| `mcpServer/elicitation/request` | `:1816` | MCP 侧表单/确认 |
| `item/permissions/requestApproval` | `:1822` | 追加权限 |
| `item/tool/call` | `:1828` | **宿主执行工具**（dynamic tool），参数 `DynamicToolCallParams{threadId,turnId,callId,namespace?,tool,arguments}`（`v2/item.rs:1668-1675`） |
| `account/chatgptAuthTokens/refresh`、`attestation/generate`、`currentTime/read` | `:1833, :1839, :1846` | 可拒绝 |
| 旧版 `ApplyPatchApproval` / `ExecCommandApproval` | `:1854, :1860` | 仅 legacy turn API，新集成不用 |

**服务端 → 客户端（通知，流式事件主体）**

| 通知 | 行号 | 说明 |
| --- | --- | --- |
| `thread/started`、`thread/status/changed`、`thread/name/updated` | `common.rs:1951, :1952, :1961` | 线程状态 |
| `turn/started` / `turn/completed` | `:1980 / :1982` | 一轮边界 |
| `item/started` / `item/completed` | `:1986 / :1991` | 条目生命周期 |
| `item/agentMessage/delta` | `:1996` | 正文增量 |
| `item/reasoning/summaryTextDelta`、`item/reasoning/textDelta` | `:2026, :2028` | 思考增量（是否出现取决于模型/供应商能力） |
| `item/plan/delta`、`turn/plan/updated` | `:1998, :1985` | 计划 |
| `item/commandExecution/outputDelta`、`item/commandExecution/terminalInteraction` | `:2007, :2008` | 命令流式输出 + 终端交互 |
| `item/fileChange/outputDelta` / `patchUpdated` | `:2010 / :2011` | 打补丁进度 |
| `item/mcpToolCall/progress` | `:2013` | MCP 进度 |
| `turn/diff/updated` | `:1984` | 本轮累计 diff（宿主可直接展示） |
| `thread/tokenUsage/updated` | `:1979` | token 计量（含上下文窗口） |
| `thread/compacted` | `:2030` | 压缩发生 |
| `error`（`ErrorNotification{error,willRetry,threadId,turnId}`） | `v2/notification.rs:59-69` | `willRetry=true` 时 turn 不中断 |
| `command/exec/outputDelta`、`process/*` | `common.rs:2000, :2002-2006` | 旁路命令/进程 |

**item 类型（`v2/item.rs` 的 `ThreadItem` 枚举，宿主 UI 需要覆盖）**：`agentMessage`、`reasoning`、`commandExecution`、`fileChange`、`mcpToolCall`、`dynamicToolCall`、`collabAgentToolCall`、`webSearch`、`imageGeneration`、`todoList`/`plan`、`error`、`sleep`、`contextCompaction` 等（枚举定义在 `v2/item.rs:128` 起，各条目详情分支自 `:128-` 展开；exec 侧同构的精简枚举见 `exec/src/exec_events.rs:104-133`）。

### 2.5 流式事件的两种 schema（要区分）

| 通道 | schema | 稳定性 | 证据 |
| --- | --- | --- | --- |
| `easycode exec --json` | JSONL，`type` 标签：`thread.started` / `turn.started` / `item.*` / `turn.completed` / `turn.failed` / `error` | 面小、独立定义、有 `ts_rs` 导出 | `exec/src/exec_events.rs:8-37`；stdout 写出 `exec/src/event_processor_with_jsonl_output.rs:108`；`--json` 开关 `exec/src/cli.rs:63-70` |
| `app-server` | notification `method` + `params`，`item`/`turn`/`thread` 全量字段 | 面大、字段多、靠 experimental 门控 | `app-server-protocol/src/protocol/common.rs` 宏表 |

> 关键差别：exec 的事件是**语义精简版**（`CommandExecutionItem{command, aggregatedOutput, exitCode, status}`，`exec_events.rs:160-166`），app-server 是**完整版**（`availableDecisions`、`commandActions`、`networkApprovalContext` 等）。宿主若要审批 UI，只能走 app-server，因为 exec 拿不到审批事件。

### 2.6 取消 / 恢复 / 续跑语义

| 语义 | 事实 | 证据 |
| --- | --- | --- |
| 取消 = 发 `turn/interrupt{threadId, turnId}` | 参数定义 | `sdk/typescript/.../turn.rs` 对应 `v2/turn.rs:357-360` |
| 取消响应**延迟**：服务端把 request 挂起，直到 core 发出 `TurnAborted` 才回 response | 实现 | `app-server/src/request_processors/turn_processor.rs:1632-1683`（`pending_interrupts.push` + 注释“Turn interrupts respond upon TurnAborted”） |
| 若 `turnId` 与当前 active turn 不符 → 直接 `invalid_request` | 校验 | `turn_processor.rs:1639-1644` |
| 若没有 active turn → `invalid_request("no active turn to interrupt")` | 校验 | `turn_processor.rs:1645-1648` |
| 启动期取消用 `turnId=""` 表示（响应立即返回） | 分支 | `turn_processor.rs:1628, 1664` |
| 取消的落地语义在 core（`Op::Interrupt`）：turn 以 aborted 结束，工具进程被终止 | 提交 | `turn_processor.rs:1660-1662` |
| 进程级取消 = 杀子进程；重启后用 `thread/resume` 恢复（历史在磁盘） | — | `thread/resume`（`common.rs:558`）；历史存储见 §3.1 |
| 恢复时模型/审批策略的还原规则（未显式覆盖则用持久化设置） | 实现 | `app-server/src/request_processors/persisted_resume_settings.rs:1-40` |

**未验证/需实测**：仓库内未搜到审批请求的超时实现（`approval_timeout` 等无匹配）。这意味着**审批悬空会无限期挂住 turn**，宿主必须自己实现超时 + 主动 `turn/interrupt`。

### 2.7 exec 通道的能力矩阵（用于判断“能不能凑合”）

`easycode exec` 的 CLI 面（`exec/src/cli.rs`）确实覆盖了不少配置，但交互能力全部缺失：

| 需求 | exec 是否支持 | 依据 |
| --- | --- | --- |
| 指定模型 | ✅ `--model`（`SharedCliOptions`） | `exec/src/cli.rs:163-170` 把 `model` 等标记为 global |
| 指定沙箱/审批 | ✅ `--sandbox`、`--config approval_policy=…` | `sdk/typescript/src/exec.ts:124-126, 169-171`（TS SDK 就是这么传的） |
| 系统提示词 | ⚠️ 只能整体替换：`-c model_instructions_file=<path>` | `core/src/config/config_loader_tests.rs:3641`（`cli_override_model_instructions_file_sets_base_instructions`） |
| 结构化输出 | ✅ `--output-schema <file>` | `exec/src/cli.rs:52-54` |
| 续跑历史 | ✅ `easycode exec resume <id>` / `--last` | `exec/src/cli.rs:172-182, 205-230` |
| fork | ✅ `easycode exec fork <id>` | `exec/src/cli.rs:176-178` |
| 审查 | ✅ `easycode exec review` | `exec/src/cli.rs:180-182` |
| 审批 UI | ❌ 请求被 reject，只回 error | `exec/src/lib.rs:2110-2133` |
| 宿主工具 | ❌ dynamic tool 请求被 reject | `exec/src/lib.rs:2146-2157` |
| turn 内追加输入 | ❌ 无 | 方法表里只有 app-server 有 `turn/steer`（`common.rs:1069`） |
| 多次交互 | ⚠️ 只能“多进程 resume”，每次冷启动 | 每次 `run` 一个进程（`exec.ts:203-206`） |
| 事件流 | ✅ JSONL（语义精简版） | `exec/src/exec_events.rs:8-37` |

> 结论：exec 适合“pong 里点一下、后台跑一遍、拿最终答案/补丁”的场景；不适合“像 IDE 一样边跑边看边批”的 agent 场景。

---

## 3. Session 与上下文

### 3.1 存储布局

| 事实 | 证据 |
| --- | --- |
| 会话落盘为 rollout（JSONL），根目录 `$EASYCODE_HOME/sessions`，归档 `archived_sessions` | `easycode-rs/rollout/src/lib.rs:86-87` |
| 同时维护 SQLite 状态库（线程索引、搜索、dynamic tools、token 计量等） | `easycode-rs/state/src/lib.rs:1`（“SQLite-backed state for rollout metadata”）；迁移 `state/migrations/0001_threads.sql` … `0020_threads_model_reasoning_effort.sql` |
| `EASYCODE_HOME` 由 `initialize` 响应回传，宿主可据此定位 | `protocol/v1.rs:76-77` |
| 线程可 `ephemeral`（不落盘） | `v2/thread.rs:114-115`；exec `--ephemeral`（`exec/src/cli.rs:40-42`） |
| fork/archive/delete/revert 均为一等 RPC | `common.rs:564, 570, 575, 767` |

> 集成建议：给 pong 指定**独立** `EASYCODE_HOME`（或 `--config` 覆盖），避免与用户自己的 easyCode 数据混库；宿主不要直接写 rollout 文件，只用 RPC 读（`thread/read`、`thread/turns/list`、`thread/items/list`）。

### 3.2 上下文组装与压缩

**上下文是“世界状态（world state）”增量式组装**，不是简单拼历史：`core/src/session/mod.rs:4482-4621` 会按模型/环境生成 `context_window` 提示、技能/插件/AGENTS 片段，再 `render_with_hints`。压缩相关：

| 事实 | 证据 |
| --- | --- |
| 压缩 prompt 默认来自 `prompts/templates/compact/prompt.md`，可被 config 覆盖 | `core/src/compact.rs:62-64, 126-131`（`turn_context.config.compact_prompt.unwrap_or(SUMMARIZATION_PROMPT)`） |
| 摘要前缀固定（用于识别历史中的压缩点） | `core/src/compact.rs:404`（`SUMMARY_PREFIX`），识别逻辑 `:623` |
| 自动压缩阈值 = `model_auto_compact_token_limit`（可配）+ 模型上下文窗口百分比 | `core/src/session/context_window.rs:53-110`（`model_auto_compact_token_limit_scope`、`resolved_context_window * effective_context_window_percent/100`）；配置项 `core/src/config/mod.rs:652-659` |
| 存在 **remote/异步压缩**（把压缩请求发给后端，而不是本地裁剪） | `core/src/session/async_compaction.rs:54-70` 要求 `Feature::AsyncCompaction` 且 `RemoteCompactionSupport::V2`；实现 `core/src/compact_remote_v2*.rs` |
| 压缩点会在历史里落 `CompactedItem` 并保留 metadata（window id、model hash 等） | `core/src/compact.rs:70-82` |
| 有 `pre/post compact` hooks | `core/src/session/async_compaction.rs` 引 `hook_runtime::run_pre_compact_hooks` |

> 对 pong 的含义：如果 pong 的模型供应商不支持 remote compaction v2，会走本地摘要路径，行为可预测；若支持，压缩请求会打到后端（数据出境面扩大）。**建议显式关闭** `features.async_compaction`/token_budget 相关实验特性，除非确认。

### 3.3 AGENTS.md 的发现与注入

| 事实 | 证据 |
| --- | --- |
| 文件名：`AGENTS.override.md` 优先，其次 `AGENTS.md`，再其次是可配置的 fallbacks | `core/src/agents_md.rs:42-49, 272-296` |
| 发现算法：从 `project_root_markers` 找到项目根，再自根向下到 cwd 逐层探测（每层取第一个存在的候选文件）；并发上限 256 | `agents_md.rs:189-270`（`MAX_CONCURRENT_ANCESTOR_PROBES=256` 见 `:54`） |
| 总预算 `project_doc_max_bytes`，默认 32 KiB，超限截断 | `agents_md.rs:68, 92, 142-166`；默认值 `core/src/config/mod.rs:255`（`AGENTS_MD_MAX_BYTES = DEFAULT_PROJECT_DOC_MAX_BYTES // 32 KiB`） |
| 拼接分隔符 `\n\n--- project-doc ---\n\n`；用户级/线程级指令与项目文档合并 | `agents_md.rs:47-49, 298-...`（`LoadedAgentsMd`） |
| 注入形态是**user 角色上下文片段**，形状 `# AGENTS.md instructions for {dir}\n\n<INSTRUCTIONS>\n{text}\n` | `core/src/context/user_instructions.rs:26-41` |
| 中途变更会下发“替换/移除”提示（世界状态更新） | `core/src/context/world_state/agents_md.rs:12-13` |
| 会话期可刷新 | `core/src/agents_md_manager.rs:67`（`agents_md.refresh`） |
| 项目被标记 untrusted 时**不加载**项目文档 | `agents_md.rs:64-66` |

> 结论：AGENTS.md 是 pong 注入“项目级/工作区级约束”的**天然外部化通道**，无需改内核。只需在启动 cwd 或 `EASYCODE_HOME` 放文件（用户级 AGENTS.md 在 `$EASYCODE_HOME/AGENTS.md`）。

### 3.4 系统提示词组装优先级（可注入点）

`core/src/session/mod.rs:801-836` 明确写出优先级：

1. `config.base_instructions`（可由 `thread/start.baseInstructions` 或 `-c model_instructions_file=...` 提供）
2. 会话历史里持久化的 `session_meta.base_instructions`
3. `render_model_instructions(model_info)`（模型目录里的 `instructions_template`，缺省回落到内置 base prompt）

补充：
- 模型目录里 `model_messages.instructions_template` 是“字面文本”，注释明确说“Formerly a personality template, now literal text”（`protocol/src/openai_models.rs:545-559`）；`render_model_instructions` 在模板缺失时只告警并返回空串（`prompts/src/model_instructions.rs:8-17`）。
- `config.model_instructions_file` 的语义是从文件读取并覆盖“选中模型的内置说明”，配置注释明确写“Users are STRONGLY DISCOURAGED”（`config/src/config_toml.rs:271-275`）。
- developer 指令走另一条通道：`config.developer_instructions`（`config_toml.rs:252-254`），作为 `developer` 角色消息注入；`<permissions_instructions>`、`<apps_instructions>`、`<collaboration_mode>`、`<environment_context>` 均可开关（`config_toml.rs:256-269`）。
- prompt caching：base instructions 文本会被 hash 成 prefix UUID 参与请求（`core/src/client.rs:996-1002`），所以**频繁变更 base prompt 会破坏前缀缓存**。

### 3.5 MCP 工具注册

| 事实 | 证据 |
| --- | --- |
| MCP server 配置在 `mcp_servers`（TOML map），支持 command/args/env/url 等 | `core/src/config/mod.rs:920`；结构 `config/src/mcp_types.rs:223`（`McpServerConfig`）、`:614`（`McpServerTransportConfig`）、`:369-371`（`command`/`args`） |
| 运行时管理器：`McpConnectionManager`，含工具目录缓存 | `core/src/mcp.rs:114-146`（`new`、`new_with_extensions`、`tool_catalog_cache`） |
| 生效服务器集合：configured/resolved/effective 三级 | `core/src/mcp.rs:464-476` |
| MCP 审批走 elicitation，而不是命令审批 | `common.rs:1816`（`mcpServer/elicitation/request`）；core 侧 `core/src/mcp_tool_call.rs:1606`（`request_approval`） |
| 支持运行时刷新（不重启） | `common.rs:1252`（`config/mcpServer/reload`）；`app-server/src/mcp_refresh.rs` |
| `exec` 模式下 elicitation 被**自动取消** | `exec/src/lib.rs:2093-2108`（注释“Exec auto-cancels elicitation”） |

### 3.6 工具面：内置工具 + 宿主工具（关键能力）

- 内置工具由 `core/src/tools/` 统一注册/路由（`registry.rs`、`router.rs`，`ToolRouter` 在 `core/src/tools/mod.rs:44` 导出），含 shell/unified_exec、apply_patch、web_search、MCP、multi-agent 等。
- **宿主可注入自己的工具**：`thread/start.dynamicTools`（`v2/thread.rs:145-151`）= `DynamicToolSpec`（`protocol/src/dynamic_tools.rs:10-43`：`Function{name,description,inputSchema,deferLoading}` 与 `Namespace`），模型调用时服务端向客户端发 `item/tool/call`（`common.rs:1828`），客户端回 `DynamicToolCallResponse{contentItems,success}`（`v2/item.rs:1677-1683`）。
- 边界：dynamic tools 在 **exec 模式被拒绝**（`exec/src/lib.rs:2146-2157`），只有 app-server 支持；且 `DynamicToolSpec` 会被持久化进 rollout session meta（`protocol/src/protocol.rs:3306-3309`，注释“Dynamic tools are defined at thread start and persisted in rollout session metadata”，`core/src/session/mod.rs:838-843`）。

> 这是 pong 最关键的抓手：**pong 可以用 dynamic tools 把 n8n 侧能力（工作流、数据库、UI 动作）以工具形式交给模型，同时保留内核的 shell/patch 能力**。

### 3.7 上下文预算、提示词缓存与成本

| 机制 | 事实 | 依据 |
| --- | --- | --- |
| 模型上下文窗口 | 取模型目录 `context_window`，并乘 `effective_context_window_percent`（默认常见 95）得到可用窗口 | `core/src/session/context_window.rs:84-107` |
| 自动压缩触发 | 超过 `model_auto_compact_token_limit`（或窗口百分比）即触发 | `core/src/session/context_window.rs:53-110` |
| token 计量上报 | `thread/tokenUsage/updated` 通知（`common.rs:1979`），payload 含上下文占用 | `common.rs:1979` |
| prompt cache | base instructions 文本被 hash 成 prefix UUID 参与请求，文本变更 = 缓存失效 | `core/src/client.rs:996-1002` |
| token budget 特性 | 存在 `features.token_budget.*`（含 auto_compact fallback prompt，上限 2000 字节） | `core/src/config/mod.rs:1235, 1290-1295` |

> 对 pong 的直接含义：
> 1. **不要往 base prompt 里塞动态内容**（时间戳、会话 id、用户昵称）。否则每轮缓存前缀都变，成本与延迟都会恶化。动态内容应走 `developerInstructions` 或 `additionalContext`（`v2/turn.rs:216-219`）。
> 2. 长会话靠内核压缩即可，但要在 UI 上把 `thread/compacted` 翻译成用户可理解的状态（否则用户会觉得“模型忘了”）。
> 3. 若 pong 计费，按 `turn/completed.usage`（`sdk/typescript/src/events.ts` 对应 `Usage`）与 `thread/tokenUsage/updated` 双通道记账。

---

## 4. 可注入点清单（外部化能力盘点）

| 能力 | 能否外部注入 | 机制 | 证据 |
| --- | --- | --- | --- |
| base system prompt | ✅（整体替换） | `thread/start.baseInstructions` / `-c model_instructions_file=…` / config `instructions` | `v2/thread.rs:104`；`config_toml.rs:250, 271-275`；优先级 `core/src/session/mod.rs:801-836` |
| developer 指令（推荐通道） | ✅ | `thread/start.developerInstructions`、config `developer_instructions`、managed requirements 的 `additional_developer_instructions` | `v2/thread.rs:106`；`config_toml.rs:252-254`；`config/src/config_requirements.rs:199` |
| 项目约束 | ✅ | `AGENTS.md` / `AGENTS.override.md` | §3.3 |
| 工具集 | ✅ 增量注入 | `thread/start.dynamicTools` + `item/tool/call` | §3.6 |
| 工具集 | ⚠️ 只能开关不能替换 | 内置工具用 feature flags/config/`disabled_plugin_ids` 控制 | `v2/thread.rs:174-175`（`disabledPluginIds`）；`easycode-rs/features` |
| 审批策略 | ✅ | `approvalPolicy`/`approvalsReviewer`（thread 与 turn 均可覆盖） | `v2/thread.rs:86-92`；`v2/turn.rs:236-243`；枚举 `protocol/src/protocol.rs:1097-1120`；`config_types.rs:183-187` |
| 审批执行者 | ⚠️ 二选一：`user`（宿主）/`auto_review`（内核 guardian） | `ApprovalsReviewer::User|AutoReview` | `config_types.rs:183-190` |
| 沙箱策略 | ✅（每个 turn 可换） | `sandboxPolicy`（read-only / workspace-write / danger-full-access / external-sandbox） | `v2/turn.rs:244-251`；枚举 `protocol/src/protocol.rs:1183-1231` |
| 工作目录 | ✅ | `thread/start.cwd`、`turn/start.cwd`、`runtimeWorkspaceRoots` | `v2/thread.rs:81-85`；`v2/turn.rs:228-235` |
| 模型/推理强度 | ✅ | `model`、`effort`、`summary` | `v2/turn.rs:252-274` |
| 结构化输出 | ✅ | `turn/start.outputSchema`（JSON Schema 约束最终消息） | `v2/turn.rs:279-282` |
| 压缩 prompt | ✅ | `config.compact_prompt` | `core/src/compact.rs:126-131`；`config_toml.rs:277-278` |
| 审批/权限提示词文本 | ❌ 硬编码 | `prompts/templates/permissions/**` | §7 |
| guardian 自审策略 | ❌ 硬编码（只能开关） | `prompts/templates/guardian/**` | §7 |
| 内核工具行为 | ❌ 硬编码 | `core/src/tools/**` | — |
| 事件 schema | ❌ 由版本决定 | 见 §2.5 | — |

---

## 5. SDK 能力（三种现成客户端）

| SDK | 形态 | 能力 | 证据 |
| --- | --- | --- | --- |
| TypeScript | `spawn(easycodePath, ["exec","--experimental-json"])`，readline 逐行 JSON | 只有 11 个选项：model/threadSource/sandboxMode/workingDirectory/skipGitRepoCheck/modelReasoningEffort/networkAccessEnabled/webSearchMode/webSearchEnabled/approvalPolicy/additionalDirectories；**无审批回调、无工具回调、无 baseInstructions** | `sdk/typescript/src/exec.ts:94-206`；选项 `threadOptions.ts:17-29`；`easycode.ts:25-38`（start/resume）；`thread.ts:66-116`（runStreamed） |
| Python | 完整 app-server stdio JSON-RPC 客户端（typed） | `initialize`、thread/turn、`approval_handler`、`approval_mode`、`base_instructions`、turn 事件迭代、goal、login | `sdk/python/src/openai_easycode/client.py:214-325`；`api.py:138-158`（`approval_mode`+`base_instructions`）；`_approval_mode.py:20-51`；`_message_router.py:69-76`（单 reader 线程路由） |
| Rust in-process | `InProcessAppServerClient::start(InProcessClientStartArgs)` | 进程内跑 app-server（无 stdio 序列化开销），`exec` 自身就用它 | `easycode-rs/app-server-client/src/lib.rs:335, 362`；调用方 `exec/src/lib.rs:1022`；服务端 `app-server/src/in_process.rs` |

Python SDK 的价值在于它演示了**生产级宿主该怎么做**：
- 版本门槛 + 字段探测：`MINIMUM_RUNTIME_VERSION = "0.151.0"`，对无版本号的 checkout 直接跑 `generate-json-schema --experimental` 读 schema 判断字段是否存在（`_runtime_requirements.py:13-64`）。
- 单 reader 线程 + per-request waiter + per-turn 事件游标（避免多线程抢 stdout）：`_message_router.py:69-76, 258-322`。
- 同一 turn 支持多个消费者（UI 渲染 + 日志）与事件裁剪：`_message_router.py:21-66, 196-206`。

> 意味着：pong 若用 Node/TS，需要**自己写**（或移植 Python 的）app-server 客户端层，约 500-900 行；TS SDK 不可复用。

---

## 6. 沙箱与审批模型

### 6.1 三层控制

1. **审批策略**（要不要问）：`AskForApproval::{UnlessTrusted, OnRequest, Granular{...}, Never}`（`protocol/src/protocol.rs:1097-1137`），`untrusted` 已被标记为不再支持的配置值（`app-server/src/config_manager_service.rs:774-777` 报错文案）。
2. **审批执行者**（谁来答）：`ApprovalsReviewer::{User, AutoReview}`（`config_types.rs:183-190`），`auto_review` 是**内核 guardian 子代理**做风险评估并自动批准/拒绝。
3. **沙箱策略**（能做什么）：`SandboxPolicy::{DangerFullAccess, ReadOnly{networkAccess}, ExternalSandbox{networkAccess}, WorkspaceWrite{writableRoots, networkAccess, excludeTmpdirEnvVar, excludeSlashTmp}}`（`protocol/src/protocol.rs:1183-1231`）。

### 6.2 审批请求的产生与回落

- 所有审批都从 core 的 `Session::request_approval` 发起：`core/src/tools/approvals.rs:454`；调用点包括命令编排（`core/src/tools/orchestrator.rs:187, 221, 531`）、unified_exec（`core/src/unified_exec/process_manager.rs:978`）、网络审批（`core/src/tools/network_approval.rs:807`）、MCP 工具（`core/src/mcp_tool_call.rs:1606`）。
- app-server 把 core 的审批事件翻译成 server request 并等待客户端响应：`app-server/src/bespoke_event_handling.rs:762-830`（组装 `CommandExecutionRequestApprovalParams` → `send_request` → `on_command_execution_request_approval_response`）。
- 决策枚举与回落：`CommandExecutionApprovalDecision::{Accept, AcceptForSession, AcceptWithExecpolicyAmendment, ApplyNetworkPolicyAmendment, Decline, Cancel}`（`v2/item.rs:68-87`）；core 侧映射里 `TimedOut → Decline`（`v2/item.rs:109`）——说明**存在“超时视为拒绝”的设计意图**，但本仓库未搜到 app-server 侧超时实现（见 §2.6）。
- `decline` 与 `cancel` 语义不同：`Decline` 只拒绝本次动作、turn 继续；`Cancel` 会中断 turn（`v2/item.rs:83-86` 注释）。
- execpolicy 规则可让某些命令免审批，并能把规则“提案”回传给客户端落盘：`proposedExecpolicyAmendment`（`v2/item.rs:1609-1612`）；引擎 `easycode-rs/execpolicy`。

### 6.3 Windows 本地单用户的现实

- Windows 沙箱是独立 crate + 服务：`windows-sandbox-rs`（ACL 设置、代理端口、`WindowsSandboxProvisioningSettings`）`windows-sandbox-rs/src/lib.rs:21-58`；托管安装/服务在 `windows-sandbox-service/`；CLI 有 `easycode sandbox` 子命令（`cli/src/main.rs:197`）与 `sandbox_setup`（Windows 专属模块，`cli/src/main.rs:80-81`）。
- 因此 Windows 上“沙箱可用”不是开箱即得：需要额外的 helper 二进制/服务与 ACL 配置；`external-sandbox` 变体则意味着“已在外部沙箱内，内核不再隔离”（`protocol/src/protocol.rs:1197-1204`）。
- 对单用户桌面，务实选择是：`workspace-write` + 网络关闭 + 宿主 UI 审批（`approvalsReviewer=user`），只在明确授权的操作上临时切换到 `danger-full-access`（按 turn 覆盖，`v2/turn.rs:244-251`）。

> 注意：`thread/shellCommand` 被注释为“runs unsandboxed with full access rather than inheriting the thread sandbox policy”（`sdk/python/src/openai_easycode/generated/v2_all.py:6266`，对应 `common.rs:739` 的 `thread/shellCommand`）。即旁路命令 RPC 不受沙箱约束，宿主用它要非常小心。

---

## 7. 硬编码提示词清单（路径 + 是否应外部化）

### 7.1 内核提示词文件

| # | 路径 | 规模 | 作用 | 建议 |
| --- | --- | --- | --- | --- |
| 1 | `easycode-rs/protocol/src/prompts/base_instructions/default.md`（= `easycode-rs/models-manager/prompt.md`，哈希一致） | 186 行 | 主 system prompt（人格、AGENTS.md 规范、工具使用、沙箱/审批说明） | **保留内核**。与工具契约/沙箱语义强耦合；整体替换会同时破坏“何时用 shell/patch”的行为。若要定制，用 `developerInstructions` 追加。 |
| 2 | `easycode-rs/prompts/templates/persistent_mode.md` | 7 行 | `persistent` 推理模式下的附加说明 | 保留 |
| 3 | `easycode-rs/prompts/templates/compact/prompt.md`、`compact/summary_prefix.md` | 7 行/个 | 压缩请求与摘要前缀 | **可外部化**（`compact_prompt` 已支持）；但 `SUMMARY_PREFIX` 参与历史识别，替换需同步改内核 → 只改 `prompt.md` |
| 4 | `easycode-rs/prompts/templates/permissions/approval_policy/{never,on_request,on_request_rule_requeued,unless_trusted}.md` | 小 | 把审批策略解释给模型 | **保留内核**（宿主 UI 文案另行渲染；内核文案与真实策略一致才安全） |
| 5 | `easycode-rs/prompts/templates/permissions/sandbox_mode/{read_only,workspace_write,danger_full_access}.md` | 小 | 把沙箱模式解释给模型 | 保留内核 |
| 6 | `easycode-rs/prompts/templates/guardian/{policy.md,policy_template.md,classifier_instructions.md,node_repl_policy.md}` | `policy.md` 59 行 | auto_review 的判定策略 | **保留内核**（安全策略）；若要改，等于重做审批模型，应关闭 auto_review 改用 `user` |
| 7 | `easycode-rs/prompts/templates/realtime/{backend_prompt,realtime_start,realtime_end}.md` | 小 | 实时语音会话 | 与本项目无关，保留 |
| 8 | `easycode-rs/prompts/templates/review/{rubric.md,exit_success.xml,exit_interrupted.xml}` | 小 | 内置 code review | 若不用 `review/start` 可忽略 |
| 9 | `easycode-rs/prompts/src/review_request.rs`（`REVIEW_PROMPT`）、`update_plan_instructions.rs`、`multi_agent_instructions.rs`、`guardian_instructions.rs` | 内联字符串 | 各功能域提示词 | 保留 |
| 10 | `easycode-rs/collaboration-mode-templates/templates/default.md`（10 行）、`plan.md`（78 行） | 小 | 协作模式（plan/default）的 developer 指令 | **可外部化/可覆盖**：`turn/start.collaborationMode.settings.developerInstructions` 为 null 时用内置，非 null 时用外部文本（`v2/turn.rs:284-291`）。pong 的业务模式应走这个口子 |
| 11 | `easycode-rs/core/templates/agents/orchestrator.md`（36 行）、`core/templates/collab/experimental_prompt.md`、`core/templates/review/*.md`、`core/templates/search_tool/*.md` | 小 | 子代理编排、协作、review 历史消息、工具描述 | 保留 |
| 12 | `easycode-rs/core/assets/tools/apply_patch.lark` | 597 B | `apply_patch` 语法定义 | **必须保留**（解析器契约） |
| 13 | `easycode-rs/core/assets/consequential_tool_message_templates.json` | 26.8 KB | 工具结果回填文案模板 | 保留（如需本地化，属于 fork 行为） |
| 14 | `easycode-rs/core/assets/agent/builtins/*.toml`、`agent_names.txt` | 小 | 内置子代理角色 | 保留 |
| 15 | `easycode-rs/ext/git-attribution/src/world_state.rs:10-27`、`ext/guardian-v2/src/async_scorer/config.rs:32`、`guardian-context/src/transcript_record.rs:19`、`tui/src/terminal_visualization_instructions.rs:4` 等 | 内联 | 领域提示词（git 归属、guardian 分类输出、转录安全、终端可视化） | 保留 |

### 7.2 外部化结论

- **必须留在内核**：base instructions、permissions/sandbox 说明、apply_patch 语法、guardian 策略。这些不是“文案”，而是**行为契约**：模型据此决定何时请求审批、如何在沙箱内操作。替换 = 重新定义安全边界。
- **应当由 pong 提供**：`developerInstructions`（业务身份、输出格式、禁止事项）、`AGENTS.md`（工作区约束）、collaboration mode 的 `developerInstructions`（pong 的 plan/默认模式）、dynamic tools 的 `description`（工具语义，模型据此选工具）。
- **可配置但不建议大改**：`compact_prompt`（可加业务摘要要求，但别破坏“保留关键事实”结构）。
- **绝对不要做**：在 pong 里拼一段“固定长提示词”替换 base prompt —— 既违反“让模型充分思考/充分用工具”的约束，也会让上面的审批/沙箱契约失效，并且破坏 prompt cache 前缀。

---

## 8. 集成方式对比（≥3 种）

评分：★=差，★★★=好。

| 维度 | A. 子进程 CLI（`easycode exec --json`） | B. app-server stdio JSON-RPC | C. TS/Python SDK | D. Rust in-process / 直接嵌 core |
| --- | --- | --- | --- | --- |
| 实质 | 每次 run 起一个进程，stdout 读 JSONL | 常驻子进程，双向 RPC | TS=封装 A；Python=封装 B | 与 easyCode 同进程 |
| 审批能力 | ❌ 全部被 reject（`exec/src/lib.rs:2110-2133`） | ✅ `item/*/requestApproval` + `availableDecisions` | TS ❌；Python ✅ | ✅（但要自己实现回调） |
| 宿主工具 | ❌ dynamic tool 被 reject（`:2146-2157`） | ✅ `item/tool/call` | TS ❌；Python 部分 | ✅ |
| 系统提示词注入 | ⚠️ 仅 `-c model_instructions_file=…`（整替）或 config | ✅ 每 thread `baseInstructions`/`developerInstructions` | TS ❌（无字段）；Python ✅ | ✅ |
| turn 内追加输入（steer） | ❌ 不支持 | ✅ `turn/steer` | ❌ | ✅ |
| 取消 | 杀进程（粗粒度，丢上下文中的 in-flight 状态） | ✅ `turn/interrupt`（精细，且能拿到 TurnAborted） | TS 用 `AbortSignal` → 杀进程；Python ✅ | ✅ |
| 多会话复用 | ❌ 一次进程一次 run（可 `resume` 但每次冷启） | ✅ 单进程多 thread（`thread/start` 多次） | 同 A | ✅ |
| 延迟 | 高：进程启动 + 配置加载 + 认证 + 会话加载 每轮一次 | 低：一次启动，后续只有 turn 往返 | A 级 | 最低（无序列化） |
| 可控性 | 低（只能设 policy/sandbox） | 高 | TS 低 / Python 高 | 最高（可改代码） |
| 版本耦合 | 中（exec JSONL schema 小且稳定） | **高**（318 JSON schema/748 TS 类型，无版本协商） | 同 A/B | 极高（编译期绑定，`0.0.0` 无 ABI 承诺） |
| 崩溃隔离 | 强（进程级） | 中（子进程，但托管多个 thread；崩了全丢） | 强/中 | 无（与宿主同死） |
| 可测试性 | 好（纯 stdin/stdout，易 mock） | 好（stdio 可录放；Python 就是范例） | 好 | 差（需完整 Rust 构建 + 依赖 V8/沙箱 helper） |
| Windows 落地难度 | 低 | 低-中（需管理子进程生命周期） | 低 | **高**（Bazel/cargo + MSVC + `rg.exe`/sandbox helper + V8 相关 crate） |
| 结论 | 仅用于“无人值守批处理” | **✅ 推荐主线** | 不单独作为方案 | ❌ 不建议 |

补充：
- B 的“进程可以放到 daemon”选项：`app-server daemon bootstrap/start/stop/version`（`cli/src/main.rs:659-687`，`app-server-daemon/src/lib.rs:1`），Windows 有 detached launch 与提权检测（`app-server-daemon/src/lib.rs:5-10`）。桌面单用户场景下**不需要** daemon，宿主直接 spawn 子进程更好控。
- B 的传输也可以选 `ws://`（`app-server/src/main.rs:39-46`）让 pong 主进程/渲染进程各自连接；但单用户本地没有收益，且增加鉴权面（`websocket-auth` crate）。

### 8.2 延迟拆解（A vs B）

| 阶段 | A. 每轮 `exec` | B. 常驻 `app-server` |
| --- | --- | --- |
| 进程启动 | 每轮一次（Windows 冷启 + DLL 加载，量级 100ms~1s，未实测） | 一次（会话建立时） |
| 配置解析（含 config.toml 分层、managed config） | 每轮一次 | 一次；后续可用 `config/*` 热改 |
| 认证/凭据加载 | 每轮一次（`exec/src/lib.rs:656-661` 会做登录限制检查） | 一次（`initialize` 阶段，`initialize_processor.rs:90-200`） |
| 会话历史加载 | 每轮一次（resume 时读 rollout） | 一次；turn 之间复用内存态 |
| 首个 token 输出 | 叠加上述全部 | 仅模型 RTT |
| turn 中断延迟 | 杀进程（立即但粗暴） | RPC + 等 `TurnAborted`（`turn_processor.rs:1632-1683`，未实测） |

> 结论：单次短任务两者差异不大；**多轮对话/长会话下 app-server 的延迟优势是数量级的**。若 pong 的用户场景是“多轮调整工作流”，必须选 B。

### 8.3 组合方案的取舍

| 组合 | 描述 | 适用 |
| --- | --- | --- |
| B 单进程多 thread | 一个 app-server 托管所有会话 | 单用户桌面、追求低内存/低延迟；崩溃丢全部 |
| B 每会话一进程 | 会话级隔离 | 需要强隔离或不同 EASYCODE_HOME；内存×N |
| B + exec 补充 | 主通道 app-server，批处理用 exec 子进程 | pong 的“后台批处理任务”与“交互式编辑”两种形态 |

---

## 9. 不可行 / 高风险（明确结论）

### 9.1 明确不可行

1. **把 `easycode exec` 当作 pong 的交互式 agent 通道** —— 审批、dynamic tool、user input、MCP elicitation 全部被显式拒绝（`exec/src/lib.rs:2086-2204`）。只能做“带沙箱的无人值守任务”。
2. **用 TypeScript SDK 做宿主集成** —— 它只有 11 个参数、没有审批/工具/提示词注入（`threadOptions.ts:17-29`、`exec.ts:94-206`）。除“提交一次任务拿最终文本”外无价值。
3. **内嵌 `easycode-core` 或直接改内核** —— 无稳定 API、无版本（`Cargo.toml:165` = `0.0.0`），构建链是 Bazel+cargo 的巨型 workspace，依赖独立 helper 进程（`easycode-code-mode-host`、sandbox helper）与 V8 相关 crate。一旦 fork，就等于接手 Codex 的全部维护成本，且上游升级无法合并。
4. **企图像“固定提示词”那样给 easyCode 一段 pong 专属 system prompt 就完事** —— 违反任务约束（要求模型充分思考、充分用工具）；内核 base prompt 与工具/审批契约耦合（§7.2），替换后模型可能不再按约定请求审批，安全边界失效。

### 9.2 高风险（需要显式决策）

| 风险 | 具体表现 | 证据 | 缓解 |
| --- | --- | --- | --- |
| 协议无版本协商 | 只有 `experimentalApi` 布尔 + 方法名；字段随手增删（如 `strip_experimental_fields` 硬编码剥离字段并留 TODO） | `v1.rs:44-70`；`transport.rs:181-203`；`v2/item.rs:1624-1631` | 锁死二进制版本；CI 里跑 `generate-json-schema --experimental` 做 diff（借鉴 `_runtime_requirements.py:39-64`） |
| 升级漂移 | 方法表 4630 行、通知 100+，任何上游变更都可能破坏 UI | `common.rs:4630` 行规模 | 只消费白名单方法/字段；其余忽略；schema diff 未通过则阻止升级 |
| 慢消费者被断开 | 出站队列满直接 `disconnect_connection`，turn 丢失 | `transport.rs:161-179` | 宿主侧 UI 更新与 RPC 解耦，用有界队列 + 丢弃策略；先落盘再渲染 |
| 审批无超时 | 未搜到审批超时；悬空审批会永久挂住 turn | §2.6 | 宿主必须自实现超时 → `turn/interrupt`；审批 UI 必须可撤销 |
| `auto_review` 不可当安全边界 | 由模型自审并自动批准/拒绝（guardian），可能误批 | `config_types.rs:183-190`；`prompts/templates/guardian/policy.md` | 默认 `approvalsReviewer=user`；auto_review 只在明确的低风险集合开启 |
| 数据出境面 | remote compaction v2、guardian 评分、attestation、analytics 等可能有外部请求 | `core/src/session/async_compaction.rs:54-70`；`compact_remote_v2*.rs`；`app-server/src/attestation.rs` | 关闭 async_compaction/token_budget/guardian；显式配置 provider；`default_analytics_enabled=false`（`app-server/src/main.rs:124`） |
| 认证与 provider | 默认走 OpenAI 登录/凭据；自定义 provider 需要配置；`exec` 会做登录限制检查 | `exec/src/lib.rs:656-661`；`config/src/config_toml.rs:332`（`model_providers`）；`model-provider-info/src/lib.rs:106-114`（`WireApi::{Responses,Chat}`） | 用自定义 provider + `wire_api`；pong 的网关需支持 Responses API 才能拿到完整能力（reasoning/compaction 语义） |
| 主路径按 Responses 建模 | 大量能力（reasoning 条目、remote compaction）假设 Responses API；`chat` wire 存在但功能降级未验证 | `model-provider-info/src/lib.rs:106-114`；`core/src/client.rs`（Responses 执行器） | 先用 `wire_api="chat"` 做能力实测矩阵；关键能力缺失则走 Responses 兼容网关 |
| 沙箱在 Windows 不是零成本 | 需要 helper/服务/ACL/代理端口；`external-sandbox` 表示“已在外部沙箱” | `windows-sandbox-rs/src/lib.rs:21-58`；`protocol/src/protocol.rs:1197-1204` | 先以 `workspace-write + network_access=false + user 审批` 上线；不强推 Windows sandbox 服务 |
| 旁路 RPC 绕过沙箱 | `thread/shellCommand` 注释为 unsandboxed full access | `sdk/python/src/openai_easycode/generated/v2_all.py:6266`；方法 `common.rs:739` | 宿主不要用它；或把它当“显式危险操作”二次确认 |
| `untrusted` 策略已废弃 | 配置 `approval_policy="untrusted"` 会直接报错 | `app-server/src/config_manager_service.rs:774-777` | 只用 `on-request`/`granular`/`never` |
| 上下文/历史双写风险 | rollout JSONL + SQLite 镜像；直接写文件会不一致 | `state/src/lib.rs:1-8`（“mirrors it into a local SQLite database”） | 宿主只读 RPC，不碰文件 |

---

## 10. 建议的「集成面契约」

### 10.1 拓扑

```
pong-studio (Electron/Node 主进程 或 独立 sidecar 管理进程)
  │  spawn（每个用户会话一个子进程；进程内可多 thread）
  ▼
easycode.exe app-server --listen stdio://
  │  EASYCODE_HOME=<pong-data>/easycode      ← 隔离数据
  │  --config model_provider=..., model=..., approval_policy=..., sandbox_mode=...
  ▼
  thread/start → turn/start → 流式通知 → 审批/dynamic tool 回调 → turn/completed
```

- 进程生命周期归 pong 管：启动、健康检查（`initialize` 成功即就绪）、退出（先 `turn/interrupt`，再关 stdin，再 `kill` 兜底）。
- 一个 app-server 进程可托管多个 thread（`thread/start` 可多次），但**一个崩溃域**；若需强隔离，每会话一进程（代价：内存与启动时间）。

### 10.2 宿主必须发送

1. `initialize`
```json
{"id":1,"method":"initialize","params":{
  "clientInfo":{"name":"pong-studio","title":"Pong Studio","version":"<ver>"},
  "capabilities":{"experimentalApi":true,"optOutNotificationMethods":["command/exec/outputDelta"]}
}}
```
随后 `{"method":"initialized"}`（无 id 的通知，`client.py:324` 同款）。

2. `thread/start`（每会话一次；history 用 `thread/resume`）
```json
{"id":2,"method":"thread/start","params":{
  "cwd":"C:\\work\\proj",
  "model":"<pong-model>",
  "approvalPolicy":"on-request",
  "approvalsReviewer":"user",
  "sandbox":"workspace-write",
  "developerInstructions":"<pong 业务约束：身份、输出格式、必须请求审批的动作>",
  "dynamicTools":[{"type":"function","name":"pong_workflow_run",
     "description":"...","inputSchema":{"type":"object","properties":{}}}],
  "ephemeral":false
}}
```
> 不要传 `baseInstructions`（保留内核 186 行 base prompt）。若必须调整，用 `developerInstructions` 追加。

3. `turn/start`
```json
{"id":3,"method":"turn/start","params":{
  "threadId":"<uuid>",
  "input":[{"type":"text","text":"<用户需求>"}],
  "cwd":"C:\\work\\proj",
  "outputSchema":{...}          // 需要结构化结果时
}}
```

4. 审批/工具/提问的**回应**（必须，否则 turn 挂起）
```json
// 命令审批
{"id":<serverReqId>,"result":{"decision":"accept"}}          // 或 acceptForSession/decline/cancel/acceptWithExecpolicyAmendment
// 文件变更审批
{"id":<serverReqId>,"result":{"decision":"accept"}}
// 宿主工具
{"id":<serverReqId>,"result":{"success":true,"contentItems":[{"type":"inputText","text":"..."}]}}
// 用户提问 / MCP elicitation：同样必须回；不支持就快速 reject（带 error），让模型降级而不是卡死
```

5. 取消
```json
{"id":4,"method":"turn/interrupt","params":{"threadId":"<uuid>","turnId":"<uuid>"}}
```
> 响应会等到 `TurnAborted` 才回（`turn_processor.rs:1632-1683`）；宿主应同时设置本地超时（例如 5s 未回则升级为进程重建）。

### 10.3 宿主必须接收并处理

| 通知 | 处理 |
| --- | --- |
| `thread/started` / `thread/status/changed` | 会话状态机 |
| `turn/started` / `turn/completed` / `turn/failed` | turn 生命周期；`turn/completed.usage` 记账 |
| `item/started` / `item/completed` | 渲染条目（按 `item.type` 分支） |
| `item/agentMessage/delta` | 流式正文（唯一必需的低延迟路径） |
| `item/reasoning/summaryTextDelta` | 思考摘要（可折叠展示；供应商可能不产出） |
| `item/commandExecution/outputDelta`、`item/fileChange/outputDelta` | 工具执行日志 |
| `turn/diff/updated` | 工作区变更预览 |
| `thread/tokenUsage/updated` | 上下文占用/成本 |
| `thread/compacted` | 提示用户“历史已压缩” |
| `error`（`willRetry=true`） | 不清空 UI，等待重试 |
| 服务端请求（§2.4） | **必须响应**；按 `method` 路由到审批 UI / 工具执行器 |

### 10.4 审批契约（建议）

- 只把 `item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`、`item/tool/requestUserInput`、`mcpServer/elicitation/request` 暴露给用户；`item/tool/call` 由 pong 内部执行（不打扰用户）。
- 决策映射：用户“允许” → `accept`；“本次会话都允许” → `acceptForSession`；“拒绝” → `decline`；“拒绝并停止” → `cancel`。
- **必须实现超时**（建议 60-120s）→ 超时按 `decline` 回，并可选 `turn/interrupt`。
- **默认 `approvalsReviewer=user`**；`auto_review` 仅作为“低风险命令免打扰”的可选优化，且必须记录审计日志（因为它是模型决策）。

### 10.5 取消 / 恢复契约

| 场景 | 动作 |
| --- | --- |
| 用户点“停止” | `turn/interrupt`；若 5s 内无 `TurnAborted`，重建 app-server 进程 |
| 进程崩溃 | 用 `thread/resume{threadId}` 恢复（历史在 `EASYCODE_HOME/sessions`）；未完成的 turn 需重新发起 |
| 宿主重启 | 启动新 app-server → `initialize` → `thread/list`/`thread/resume` → 展示历史 |
| 会话结束 | 关闭 turn（不强制 interrupt，等 `turn/completed`）→ 关 stdin → 等退出 → `kill` 兜底 |

### 10.6 版本与可测试性契约

- **锁版本**：把 `easycode.exe` 及 `easycode-code-mode-host.exe`/`rg.exe` 作为受版本控制的 artifact 随 pong 安装包分发，记录 SHA256。
- **启动自检**：`initialize` 返回的 `userAgent`/`easyCodeHome` 做断言；CI 里跑 `easycode generate-json-schema --experimental --out <tmp>`，与 pong 内置的 `schema/` 快照 diff（方法名 + 关键字段集），失败即阻断升级。
- **录制回放**：把 app-server 的 stdio 流量按 JSONL 录制（请求/通知/响应），做离线回放测试；这比 mock 内核更可靠。
- **契约测试清单**：initialize/initialized 顺序、thread/start 字段回显、turn/start 流式顺序、审批 6 种决策、interrupt 的延迟响应、断线重连、`error.willRetry` 不清空、`dynamicTools` 往返。

### 10.7 宿主侧实现模块（TS 视角，职责边界）

| 模块 | 职责 | 关键约束 |
| --- | --- | --- |
| `EasycodeProcess` | spawn/kill/健康检查/退出清理 | 必须 `stdio: 'pipe'` 且逐行读取；不要用 shell 包装 |
| `JsonRpcConnection` | 写请求、分配 id、匹配响应、发送通知、错误映射 | 单写队列；写失败即整连接失败 |
| `NotificationRouter` | 按 `method` 分发；按 `threadId`/`turnId` 归并事件 | 不能阻塞（参考 `_message_router.py:69-76`） |
| `ServerRequestRouter` | `item/*/requestApproval` → UI；`item/tool/call` → pong 工具执行器 | **必须总有响应**；未知方法回 error 而不是不回 |
| `ThreadStore` | threadId ↔ pong 会话映射、历史缓存 | 真相在 easyCode 的 `EASYCODE_HOME`，宿主只缓存 |
| `ApprovalPolicy` | 超时、默认决策、审计日志、白名单 | 超时必须落地为 `decline`；`cancel` 会终止 turn |
| `TurnLifecycle` | turn 状态机、中断、失败重试 | `turn/failed` 与 `error.willRetry` 语义不同（`v2/notification.rs:59-69`） |
| `SchemaGuard` | 启动时校验方法/字段集 | 用 `generate-json-schema --experimental` 产物做 diff |
| `Recorder` | stdio 流量录制/回放 | 用于离线回归；不要录制含密钥的 params |

实现量级参考：Python SDK 的 client+router 合计约 1100 行（`client.py` 806 行 + `_message_router.py` 336 行），TS 侧预计相当。**这是本项目最实的工作量**，应在排期里单列。

---

## 11. 关键文件索引（按主题）

| 主题 | 文件 |
| --- | --- |
| 方法/通知总表 | `easycode-rs/app-server-protocol/src/protocol/common.rs` |
| JSON-RPC 帧 | `easycode-rs/app-server-protocol/src/rpc.rs` |
| 握手参数 | `easycode-rs/app-server-protocol/src/protocol/v1.rs` |
| thread/turn 参数 | `easycode-rs/app-server-protocol/src/protocol/v2/thread.rs`、`v2/turn.rs` |
| item / 审批 / dynamic tool | `easycode-rs/app-server-protocol/src/protocol/v2/item.rs`、`protocol/src/dynamic_tools.rs` |
| 传输与背压 | `easycode-rs/app-server/src/transport.rs`、`app-server-transport/` |
| 请求分发 | `easycode-rs/app-server/src/message_processor.rs`、`request_processors/` |
| 中断语义 | `easycode-rs/app-server/src/request_processors/turn_processor.rs` |
| 审批桥接 | `easycode-rs/app-server/src/bespoke_event_handling.rs` |
| exec JSONL | `easycode-rs/exec/src/exec_events.rs`、`event_processor_with_jsonl_output.rs` |
| exec 拒绝交互式能力 | `easycode-rs/exec/src/lib.rs:2086-2204` |
| session / 上下文 | `easycode-rs/core/src/session/mod.rs`、`session/context_window.rs`、`session/async_compaction.rs` |
| 压缩 | `easycode-rs/core/src/compact.rs`、`compact_remote_v2*.rs`、`prompts/src/compact.rs` |
| AGENTS.md | `easycode-rs/core/src/agents_md.rs`、`agents_md_manager.rs`、`context/user_instructions.rs` |
| 审批引擎 | `easycode-rs/core/src/tools/approvals.rs`、`orchestrator.rs`、`execpolicy/` |
| 沙箱 | `easycode-rs/sandboxing/`、`linux-sandbox/`、`windows-sandbox-rs/`、`windows-sandbox-service/` |
| MCP | `easycode-rs/core/src/mcp.rs`、`config/src/mcp_types.rs`、`rmcp-client/` |
| 提示词 | `easycode-rs/prompts/`、`core/templates/`、`core/assets/`、`models-manager/prompt.md`、`protocol/src/prompts/` |
| SDK | `sdk/typescript/src/`、`sdk/python/src/openai_easycode/` |

---

## 12. 明确未验证 / 需实测项

1. Windows 上 `workspace-write` 是否无需额外服务即可工作（`windows-sandbox-rs` 有独立 helper 与 ACL 设置代码，实际是否需要管理员安装未验证）。
2. `wire_api="chat"` 下模型是否真的能用全部工具（代码里工具调用按 Responses 语义建模，chat 路径的行为未见专门实现）。
3. `turn/interrupt` 从发出到 `TurnAborted` 的实测延迟与最坏情况。
4. `thread/resume` 在 turn 进行中被中断后的历史一致性（rollout 是否有半条 item）。
5. `dynamicTools` 的 `deferLoading` 语义（是否等价于“按需暴露工具描述”，影响 token 预算）。
6. guardian `auto_review` 的实际误批率（只能实测，不能从代码断定）。

---

## 13. 最小验证计划（PoC，按顺序做，每步有判定标准）

| # | 实验 | 做法 | 通过标准 | 失败含义 |
| --- | --- | --- | --- | --- |
| P0 | 二进制可跑 | `easycode app-server --listen stdio://` + 手写 `initialize`/`initialized` | 收到 `InitializeResponse` 且含 `easycodeHome/platformOs` | 环境/认证问题，先解决 |
| P1 | 一轮对话跑通 | `thread/start`（`approvalPolicy:"never"`, `sandbox:"workspace-write"`）+ `turn/start` 一句“读 README 并总结” | 收到 `item/agentMessage/delta` 与 `turn/completed` | 模型/provider 配置问题 |
| P2 | 宿主工具往返 | `thread/start.dynamicTools` 加一个 echo 工具，prompt 要求调用它；宿主回 `success:true` | 模型两次调用之间正确往返，且 `item/completed` 有结果 | dynamic tool 语义与预期不符，需查 `common.rs:1828` 与持久化（`protocol.rs:3306`） |
| P3 | 审批往返 | `approvalPolicy:"on-request"`，prompt 要求执行 `del`/写文件；宿主收到 `requestApproval` 并回 `decline` 再回 `accept` | 两种决策行为符合 `v2/item.rs:68-87` 语义 | 审批门控与沙箱组合有问题 |
| P4 | 中断 | turn 中发 `turn/interrupt` | 5s 内收到 `turn/completed`（aborted）或 `TurnAborted`；无卡死 | 需把“进程重建”作为兜底 |
| P5 | 恢复 | 杀进程 → 重启 → `thread/resume` | 历史可读、能继续 `turn/start` | 持久化/`EASYCODE_HOME` 隔离问题 |
| P6 | 版本守卫 | 跑 `generate-json-schema --experimental`，与内置快照 diff | 方法/字段集一致 | 阻止该版本进入发布 |

> 建议 P0-P5 用同一份 TS 客户端骨架完成，P6 进 CI。这套 PoC 的产物就是 §10.7 的模块骨架，不要当作一次性脚本丢弃。
