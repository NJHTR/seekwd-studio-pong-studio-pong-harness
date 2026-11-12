# 第二轮反驳记录（红队 vs 作者）

- 日期：2026-11-12
- 参与：red-teamer（评审）、easycode-analyst、studio-architect、protocol-designer、desktop-engineer
- 规则：作者只能接受或带证据反驳；不接受"以后再说"；不改原文档，结论并入 ADR-001。

## 1. 对抗回合

| 回合 | 内容 | 结果 |
|---|---|---|
| R0 | 四份独立调研（easyCode / pong 基座 / 多 Agent 协议 / 桌面运行时） | 完成，共 2734 行，含代码引用 |
| R1 | 红队对四份文档对抗审查 + 本机 10 项实测 | 完成，483 行；Top5 blocker + 20 条必须改 + 6 条立项闸门 |
| R2 | 四作者逐条反驳/接受 | 完成，见下；3 条红队判断被修正，2 条被确认 |

## 2. 逐条裁定

### 2.1 easyCode 通道与审批（红队 A1/A2/A3）

| 红队主张 | 作者反驳 | 裁定 |
|---|---|---|
| 出站队列 128 满即断连并丢审批 | 128 是 **stdio 写通道**容量；stdio 连接 `disconnect_sender: None`，实际走 `send().await` **阻塞**（`transport/stdio.rs:53,61`、`app-server/src/lib.rs:981`）；断连只发生在 ws/remote-control | **红队部分错**：不是丢弃，是 head-of-line 阻塞。风险仍在（阻塞会让审批延迟），宿主契约按"阻塞"设计 |
| 审批无超时 → turn 永久挂 | 确认；全仓无 `approval_timeout`，无配置可调 | **红队正确**：宿主实现 120s 超时 + decline + 审计 |
| interrupt 竞态误判 | 确认 `invalid_request("no active turn")` 存在（`turn_processor.rs:1645-1649`） | **红队正确**：视为已结束，不重建进程 |
| 数据真源冲突 | 真源是 rollout JSONL，SQLite 是镜像；WAL + busy retry + 迁移容忍并行（`sqlite/busy_retry.rs:23`、`migrations.rs:14-19`） | **部分修正**：共享 home 可行；每 agent 一 home 作为强隔离选项 |
| 宿主自研客户端成本被低估 | 确认；无版本协商，需锁版本 + schema diff | **红队正确**：按 2× 维护成本预算，8 项契约测试强制 |

### 2.2 pong 集成落点（红队 D 节）

| 红队主张 | 作者反驳 | 裁定 |
|---|---|---|
| 不需要新 cli module / HTTP / 前端 feature | **接受**：`/agents/system` 已有 chat/resume/threads/queue；`AgentTurnExecutionService` 有 `prepare/streamTurn` 边界；35 个实体可复用；最小落点为 `system-agents/easycode/` 两个文件 + `runtime_kind` 迁移 | **按红队执行**：不新建模块/HTTP/前端 feature |
| license 是假 blocker | **确认**：`base-command.ts:403` 在 `initBinaryDataService`（S3/Azure 分支）；启动 license 在 `:555-557`→`start.ts:251`，无证书只 skip。但纠正：181 处 `feat:` 中 99 在测试，生产 82（34 文件） | **风险降级**：启动不依赖 license；保留 `buildLicenseHints` 提示词污染清理（真实风险） |
| 链路数是 3 不是 4 | **接受**：Agent 节点是 workflow 内执行器，无 session/thread/approval | **纠正**：并行对话链路 3 条 |

### 2.3 多 Agent 协议（红队 M 节）

| 红队主张 | 作者反驳 | 裁定 |
|---|---|---|
| 13 种 → 主体是换皮 JSON | **部分接受**：接受 5 语义槽不可替代（task_assigned / artifact / conclusion_proposed / conclusion_challenged / approval），其余回落现有 RPC/实体 | **落地为 6 kind**（含 approval_decided），删版本协商/lease/进度/ack/hello |
| envelope 缺 seq、缺 user_input、lease 不存在 | **seq 反驳**：排序用 pong 日志 `seq`，生产者不可预知；加可选 `log_seq`（写者回填）。`awaiting_input`/`lease` 确认为硬伤，lease 删，`awaiting_input` 并入 `awaiting_decision` | **接受修订** |
| 砍到 2 种消息先验证 | **不接受砍到 2+1**：两臂需 `task_assigned` 保证 spec 一致；artifact 需 digest/parents；challenge 需 proposed；审批连接级且超时未验证，必须持久报文 | **折中**：6 kind，先做 A/B 再扩展 |

### 2.4 桌面与二进制（红队 D1/D3 节）

| 红队主张 | 作者反驳 | 裁定 |
|---|---|---|
| release 产物不存在、`<150MB` 门禁不可达 | **确认**：产出者应是 easyCode fork release CI；本机 `dist/.../README.txt` 自述 `dev-small`；门禁移到 M0 出口，失败显式二选一（dev-small 或 C） | **接受**：M0 出口决策，不静默发布 |
| M2 前上 Tauri 不必要，先 C 方案 | **有条件接受**：启动器复用同一 Rust 监督器，否则 M3 返工；收回"浏览器不能阻塞审批"的说法 | **接受**：C-first，M3 复用监督器 |
| `bin/easycode-command-runner.exe` 路径错 | **确认**：实际在 `easycode-resources/`，`rg.exe` 在 `easycode-path/` | **修正** |
| Windows 原生已可用，R1 可降级 | **反驳**：只验证了启动 + initialize，未覆盖 turn/审批/沙箱/长会话，R1 应保持 blocker 到 M0 全链路 | **接受作者**：R1 保持 blocker |

## 3. 最终裁定摘要

- 接受红队：审批超时/竞态/归属契约、最小集成落点、协议砍到 6 kind、C-first、M0 二进制决策、license 风险降级。
- 修正红队：stdio 是阻塞不是丢弃；共享 `EASYCODE_HOME` 可行（附配置项）；Windows 原生"能跑"不等于"能用"。
- 被否决的设计：13 种消息 + 版本协商 + 双层黑板；新 cli module/HTTP/前端 feature；Electron；整体替换 base prompt；`exec` 主通道。

以上结论已写进 `docs/architecture/adr-001-easycode-desktop.md` 与 `docs/plan/development-plan.md`。
