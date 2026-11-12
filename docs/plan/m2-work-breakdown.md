# M2 工作分解：多 Agent 编排层（文件级）

- 状态：计划（依赖 `@pong/agent-protocol` v0.1）
- 日期：2026-11-13
- 依据：ADR-001 §6/§10.3、`docs/poc/m1-ab-baseline.md`、`agent-protocol-v0.1.md`

## 1. 原则

1. 复用现有 agents 模块（实体、迁移、controller、SSE、审批桥），**不新建 cli module / HTTP 前缀 / 前端 feature**。
2. 黑板 append-only 是唯一真源；消息只带 artifact 引用与摘要，不内联大上下文。
3. 自适应 handoff：默认 prose，超阈值/需保真时升级 artifact（由 `@pong/agent-protocol` 的 selector 决定）。
4. producer != verifier；能跑验收命令就不投票；仲裁只处理不可自动判定冲突并写 `basis[]`。
5. 所有角色都复用 `runtime=easycode` 的 system agent；每个 role 一个 thread，审批走既有端点。

## 2. 数据模型（新增表，`packages/@pong/db` 迁移）

| 表 | 关键列 | 说明 |
|---|---|---|
| `agent_task` | `id`(ULID PK), `project_id`, `parent_id`, `status`, `title`, `goal_ref`(artifact), `created_at`, `updated_at` | 任务状态机：pending → in_progress → awaiting_decision → blocked/completed/failed/cancelled |
| `agent_task_message` | `id`(ULID PK), `task_id`, `log_seq`(bigint, unique(task_id,log_seq)), `kind`, `envelope`(json), `idempotency_key`(unique), `created_at` | 黑板；append-only，禁止 update/delete |
| `agent_artifact_manifest` | `sha256`(PK), `media_type`, `bytes`, `summary`, `parents`(json), `storage_ref`, `created_at` | 内容寻址；同 hash 幂等 |
| `agent_conclusion` | `id`(ULID PK), `task_id`, `message_id`, `claim`, `evidence`(json), `artifacts`(json), `confidence`, `falsifiers`(json), `status`(proposed/challenged/accepted/rejected), `superseded_by`, `created_at` | 结论与挑战/裁决 |

迁移命名：`1794600000000-AddAgentTaskOrchestration.ts`（common，sqlite/postgres 索引由生成器产出）。

## 3. 服务（`packages/cli/src/modules/agents/orchestrator/`）

| 文件 | 职责 | 关键点 |
|---|---|---|
| `protocol-bus.service.ts` | `append(taskId, envelope)` / `list(taskId, afterSeq)` / `subscribe` | 用 `@pong/agent-protocol` 校验；`log_seq` 单写者；幂等键唯一冲突→返回已有消息 |
| `task.service.ts` | 创建/分派/状态迁移/角色分配 | 非法迁移抛 ConflictError；每次迁移写 `system` 消息 |
| `artifact-store.service.ts` | `put(bytes, meta)` / `get(uri)` / `verify(uri)` | 存 `PONG_USER_FOLDER/agent-artifacts/sha256/<2>/<62>`；manifest 幂等；`verify` 重算 hash |
| `handoff.service.ts` | 用协议 selector 选择 prose/artifact；生成 handoff 消息 | 阈值可配；`estimatedBytes` 记录到消息 telemetry |
| `verifier.service.ts` | 运行 `agent_task` 的验收命令/测试；产出 verdict 消息 | 优先可执行命令；无命令才请 reviewer 结论；producer 不得自验 |
| `replay.service.ts` | 按 `log_seq` 重放；校验 artifact 存在与 hash | 幂等；输出最终状态快照 |
| `orchestrator.service.ts` | 驱动 planner→coder→reviewer；处理 challenge/verdict | 每角色一个 easycode thread；handoff 走 `handoff.service`；审批复用现有 bridge |
| `agent-tasks.controller.ts` | 任务 REST（复用现有鉴权/权限） | `POST /agents/tasks`、`GET /agents/tasks/:id`、`GET .../messages`、`POST .../conclusions/:id/challenge`、`POST .../replay` |
| `migrations/` 索引 | 由 `gen:migration-index` 生成，不手改 | — |

## 4. 角色与状态机

- planner：产出 `task_assigned` 子任务图 + `conclusion_proposed(plan)`；
- coder：消费 handoff（prose 或 artifact 引用），产出 `artifact_published` + `conclusion_proposed`;
- reviewer：只读黑板 + 验收命令结果，产出 `conclusion_challenged` 或接受；
- arbiter：仅处理不可自动判定冲突，写 `basis[]`；不新增消息类型（裁决并入 `conclusion_proposed.resolved_by`）。

状态机（任务）：
```
pending → in_progress → (awaiting_decision | blocked) → completed
                     ↘ failed / cancelled
```

## 5. 测试

| 类型 | 内容 |
|---|---|
| 单测 | bus seq/幂等、非法状态迁移、artifact 往返/篡改检测、replay 确定性、handoff 阈值 |
| 集成 | fake easycode + 假 planner/coder/reviewer 脚本完成一次 3-agent 任务；challenge→修订→验证闭环 |
| 真机（gated） | 一次真实 3-agent 任务（planner/coder/reviewer 各一个 thread），记录 token/时延/返工 |

## 6. 里程碑内顺序

1. 迁移 + 实体 + repository；
2. protocol-bus + artifact-store + replay（可独立测）；
3. task/verifier + controller；
4. orchestrator + roles（依赖 easycode runtime 已就绪）；
5. 集成/真机测试 + A/B 阈值校准（≥10 runs/臂/档，隔离校验）。

## 7. 退出标准

- 一个真实任务由 planner→coder→reviewer 完成；
- challenge 能触发修订，仲裁有 `basis`；
- replay 重现最终 artifact hash；
- 多 agent 成功率不低于单 agent，handoff token 显著下降（以实测为准）。
