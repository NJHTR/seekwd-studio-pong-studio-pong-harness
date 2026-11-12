# 多 Agent 协议 v0.1（冻结实现）

- 状态：**冻结**（2026-11-13）。实现：`packages/@pong/agent-protocol`（`@pong/agent-protocol@0.1.0`）。
- 依据：[ADR-001 §6 / §10.3](./adr-001-easycode-desktop.md)、[M1 A/B 基线](../poc/m1-ab-baseline.md)、[M2 工作分解](../plan/m2-work-breakdown.md)。
- 范围：本包只拥有 wire contract（信封、6 种消息、artifact 引用、自适应 handoff 选择器）。传输、存储、黑板、调度、版本协商不在此包。
- 变更规则：本文件冻结后，新增消息/字段必须走 ADR 评审；v0.1 只增不改。

## 1. Envelope（信封）

```json
{
  "protocol": "pong.agent/0.1",
  "kind": "task_assigned | artifact_published | conclusion_proposed | conclusion_challenged | approval_requested | approval_decided",
  "id": "01J...ULID",
  "sent_at": "2026-11-13T03:30:00Z",
  "from": { "agent_id": "planner.1", "role": "planner | coder | reviewer | arbiter" },
  "to": { "agent_id": "coder.1" },
  "task_id": "01J...ULID",
  "idempotency_key": "sha256:<64 lowercase hex>",
  "parent_id": "01J...ULID?",
  "log_seq": 42,
  "notes": "≤400 字可读摘要（可选逃生舱）",
  "payload": { "...kind-specific...": null }
}
```

| 字段 | 必填 | 语义与约束 |
|---|---|---|
| `protocol` | 是 | `^pong\.agent/0\.\d+$`。v0.1 生产者写 `pong.agent/0.1`；用 pattern 而非 `const`，使 minor 升级后旧日志仍可解析（版本协商不在协议内，见 §6）。 |
| `kind` | 是 | 6 种冻结枚举；未知 kind 由消费方按"不支持"拒绝，不猜测。 |
| `id` | 是 | ULID（26 位 Crockford base32，首字符 0–7）。**不是排序键**。 |
| `sent_at` | 是 | ISO-8601 带时区；只表示产生时间，不参与排序/去重。 |
| `from` | 是 | `agent_id` + `role`（planner/coder/reviewer/arbiter）。角色决定可发哪些 kind。 |
| `to` | 是 | 仅 `agent_id`。广播由编排层展开为多条消息，协议不引入 recipients 数组。 |
| `task_id` | 是 | ULID。一个 task 一个黑板通道；跨任务引用必须走 artifact 授权。 |
| `idempotency_key` | 是 | `sha256:<64hex>`，由 `createIdempotencyKey(...parts)` 生成；**重试复用同一 key**，DB 唯一索引负责去重。 |
| `parent_id` | 否 | 被回复消息的 `id`。`approval_decided` 必填（指向 `approval_requested`）；`conclusion_challenged.target_id` 另指结论消息。 |
| `log_seq` | 否 | **仅黑板写者回填**，非负整数、单调。生产者（agent）不得设置；读侧排序只认它。 |
| `notes` | 否 | ≤400 字自由文本，只供人读；不参与任何判定，不得承载决策。 |
| `payload` | 是 | 由 `kind` 决定，见 §2。 |

信封与所有 payload 对象均为 **strict**：未知字段直接校验失败（冻结期的有意选择；扩展需 ADR）。

## 2. 六种消息（payload 字段语义）

### `task_assigned`
| 字段 | 类型 | 说明 |
|---|---|---|
| `brief` | string 1–2000 | 可执行任务简述；大事实走 `inputs` artifact。 |
| `acceptance` | string[] 1–16（每项 ≤500） | 可执行/可判定的验收项；verifier 优先逐条执行。 |
| `inputs` | artifact URI[] ≤16，默认 `[]` | 输入产物引用，禁止内联正文。 |
| `deadline` | ISO-8601? | 任务期限；超时由编排层处理（协议不定义 timeout 消息）。 |

### `artifact_published`
payload 即 artifact manifest：
| 字段 | 类型 | 说明 |
|---|---|---|
| `uri` | `artifact://sha256/<64hex>` | 内容寻址，不可变。 |
| `media_type` | lowercase `type/subtype` | 例如 `application/vnd.pong.patch+unified-diff`。 |
| `bytes` | int ≥0 | **UTF-8 字节数**，不是字符数。 |
| `summary` | string 1–400 | 会进模型上下文；必须脱敏、按不可信数据处理。 |
| `parents` | artifact URI[] ≤16，默认 `[]` | 版本链（新版本 = 新 digest + parents）。 |

### `conclusion_proposed`
| 字段 | 类型 | 说明 |
|---|---|---|
| `claim` | string 1–2000 | 一句话交付声明。 |
| `evidence` | string[] 1–16（每项 ≤2000） | artifact URI 或可复现命令；**不允许空**。 |
| `artifacts` | artifact URI[] ≤16，默认 `[]` | 交付物。 |
| `confidence` | number 0–1 | 自评置信度（供仲裁参考，不作为判定依据）。 |
| `falsifiers` | string[] ≤8（每项 ≤500），默认 `[]` | 什么观察能推翻该结论。 |
| `resolved_by` | `{decision: accept\|reject\|revise, basis: string[] 1–16}`? | 仲裁结果并入本字段，不新增 kind；`basis` 必填。 |

### `conclusion_challenged`
| 字段 | 类型 | 说明 |
|---|---|---|
| `target_id` | ULID | 被质疑的 `conclusion_proposed.id`。 |
| `reason` | enum：`unsupported_claim` / `contradiction` / `missing_evidence` / `scope_creep` / `regression` / `ambiguity` | 质疑类型；细节放 `detail`。 |
| `detail` | string 1–2000? | 论证正文。 |
| `counter_evidence` | string[] 1–16 | 反证（artifact URI 或命令）。 |
| `requested_action` | enum：`revise` / `retest` / `escalate` / `withdraw` | 期望动作。 |

### `approval_requested`
| 字段 | 类型 | 说明 |
|---|---|---|
| `request_kind` | enum：`command` / `fileChange` / `permissions` / `input` | 与 easyCode server request 对齐，见 §5。 |
| `title` | string 1–200 | UI 标题。 |
| `detail` | string 1–2000? | 变更摘要/权限范围等。 |
| `command` | string? | **`request_kind=command` 必填**。 |
| `cwd` | string? | 命令工作目录。 |
| `reason` | string? | 模型给出的理由（按不可信数据处理）。 |
| `available_decisions` | enum[] 1–3：`accept` / `decline` / `acceptForSession` | 可选决策集。 |
| `expires_at` | ISO-8601 | 到期后 UI 显示"未知结果"，编排层按 decline 处理。 |
| `question` | string? | **`request_kind=input` 必填**（用户输入并入审批）。 |
| `options` | string[] ≤16? | 输入选项；自由文本仍走 `answers`。 |

### `approval_decided`
| 字段 | 类型 | 说明 |
|---|---|---|
| `decision` | enum：`accept` / `decline` / `acceptForSession` | 与 easyCode 决策枚举一一映射。 |
| `answers` | `Record<questionId, string[]>`? | `input` 类审批的回答。 |
| `reason` | string? | 决策理由（可选，审计用）。 |

跨消息不变量（由 `messageSchema` 强制）：`approval_decided` 必须带 `parent_id`。

## 3. Artifact 内容寻址

- URI：`artifact://sha256/<64 lowercase hex>`（`createArtifactUri` / `parseArtifactUri` / `tryParseArtifactUri`）。
- 哈希：`hashArtifactContent(content: string | Uint8Array)`，SHA-256、小写 hex；`createArtifactManifest` 从字节派生 URI 与 `bytes`；`verifyArtifactContent` 重算并比较。
- 不可变：同 digest 内容唯一；版本链用 `parents[]`，禁止原地修改。
- 本包不存储字节。M2-B 的 `artifact-store` 负责落盘（计划路径 `PONG_USER_FOLDER/agent-artifacts/sha256/<2>/<62>`）与读取时校验。
- `summary` 与 `notes` 会进入模型上下文：发布前脱敏、标注为不可信数据。

## 4. 自适应 handoff（A/B 结论的产品化）

`selectHandoff(candidate, options)` 返回 `{ mode, reason, estimatedBytes, proseChars }`。

| 条件（按优先级） | 结果 |
|---|---|
| `requiresByteFidelity` | artifact / `byte_fidelity_required` |
| `requiresDiff` | artifact / `diff_required` |
| `requiresManifest` | artifact / `manifest_required` |
| 文件数 > `artifactFileThreshold`（默认 3） | artifact / `multi_file` |
| prose 码点数 > `proseBudgetChars`（默认 600） | artifact / `over_prose_budget` |
| 其余 | prose / `within_prose_budget` |

- `estimatedBytes` 是 prose 的 UTF-8 字节数（telemetry）；`proseChars` 是码点数（阈值比较）。
- 边界：600 码点 → prose；601 → artifact；3 文件 → prose；4 文件 → artifact。
- 依据：`docs/poc/m1-ab-baseline.md` —— small payload 用结构化 **+80% tokens / +19% 时延**（默认 prose）；large payload（10 文件 / ~1.7KB diff）自由文本首轮 **0/3**、结构化 **5/5**，tokens 约 **1/5.7**。因此默认 prose，只在超容量/需保真时升级。
- 选择器是纯函数；调用方（M2-B `handoff.service`）负责配置阈值并把 `mode/reason/estimatedBytes` 记入消息 telemetry。

## 5. 与 easyCode 事件 / 审批的映射

| 协议消息 | easyCode / pong 来源 | 映射规则 |
|---|---|---|
| `approval_requested` | `item/commandExecution/requestApproval`、`item/fileChange/requestApproval`、`item/permissions/requestApproval`、`item/tool/requestUserInput` | 前三种 → `request_kind` 同名；`requestUserInput` → `input` + `question/options`。`approvalId/threadId/turnId/itemId` 仍是 pong 实体字段，不重复进协议（关联用 `parent_id`）。 |
| `approval_decided` | server request 的 response `{decision}` / M1-C 决策端点 | `accept`/`decline`/`acceptForSession` 原样映射；`input` 的 `answers` 映射 M1-C `answers`。 |
| `task_assigned` | `turn/start`（input + `outputSchema`） | `brief`/`acceptance` 由编排层渲染进 turn 输入；`inputs` 作为 artifact 引用注入。 |
| `artifact_published` | `item/fileChange`、`item/commandExecution`、`turn/completed` usage | easyCode item **没有 digest**：由宿主按字节计算 manifest（M1-B `artifact-bridge`）。test report / diff 由宿主聚合后发布。 |
| `conclusion_proposed` | `turn/completed` + 受 `outputSchema` 约束的最终输出 | 模型输出经本包校验；不合法时 `schema_violation` 回落为 verifier 复核（M2-B）。 |
| `conclusion_challenged` | 无原生事件 | verifier 角色产生；`reason/requested_action` 由验证结果与规则引擎决定。 |

M1-C host event 的 `expiresAtMs`（epoch ms）在适配层转换为协议 `expires_at`（ISO-8601）；`approvalId` 保存在 pong，协议侧关联靠 `parent_id`。

**不进协议**：turn/item 流式事件、token usage、tool call 明细、reasoning、progress、cancel（`turn/interrupt`）、错误（既有错误映射）、握手/版本协商（启动自检）。这些已有载体，重复定义只会产生第二套真相。

## 6. 明确不做（防过度设计）

1. **版本协商 / hello / ack / retry 消息**：启动自检 + DB 幂等（`unique(idempotency_key)`）已覆盖。
2. **progress 消息**：直接映射 `turn/*`、`item/*` 事件。
3. **lease / heartbeat**：调度与租约属于 pong task 表，不进 wire contract。
4. **传输/存储/队列**：由 `@pong/easycode-runtime` 与 M2-B orchestrator 负责。
5. **仲裁新 kind**：裁决并入 `conclusion_proposed.resolved_by`。
6. **内联大上下文**：只允许 artifact 引用；`notes` 有 400 字硬上限。
7. **重复消息 ack**：DB 唯一键返回已有消息（M2-B `protocol-bus`）。

## 7. API 导出（`@pong/agent-protocol`）

- 信封：`PROTOCOL_V0_1`、`MESSAGE_KINDS`、`AGENT_ROLES`、`envelopeSchema`、`parseMessage`、`safeParseMessage`、`createIdempotencyKey`、类型 `Envelope`/`ProtocolMessage`/`MessageOfKind`。
- 消息：6 个 payload schema、6 个消息 schema、`conclusion*`/`approval*` 常量与类型。
- Artifact：`createArtifactUri`、`parseArtifactUri`、`tryParseArtifactUri`、`hashArtifactContent`、`createArtifactManifest`、`verifyArtifactContent`、`artifactManifestSchema`。
- Handoff：`selectHandoff`、`DEFAULT_PROSE_BUDGET_CHARS`、`DEFAULT_ARTIFACT_FILE_THRESHOLD`、`HANDOFF_REASONS`。
- ULID：`createUlid`、`isUlid`、`ulidTimeMs`。
- 测试 fixture：`@pong/agent-protocol/testing`（`makeFixtureMessage`、固定 ULID/artifact）。

## 8. 与 ADR / 任务卡的偏差（需 Lead 确认）

1. `idempotency_key` 冻结为严格 `sha256:<64hex>`（ADR §6 示例为 `sha256:...`，任务卡只要求"幂等键"）；好处是重试可复现、DB 唯一索引语义明确。
2. `conclusion_challenged.reason/requested_action` 使用枚举（ADR §6 只列字段名）；自由论证放 `detail`。
3. `conclusion_proposed.resolved_by` 为可选新增字段（ADR §6 注释与 M2 工作分解要求"裁决并入此字段"），未新增 kind。
4. 内容哈希用 `node:crypto`（同步、支持 bytes），未用 `@pong/utils/sha256`（仅 string、异步、浏览器优先）；算法与 hex 输出一致。
5. `approval_requested.expires_at` 用 ISO-8601（ADR §6 未定义），宿主 easyCode 事件仍是 epoch ms，由适配层转换。
6. `protocol` 用 `0.x` pattern 而非 `const`，保证 minor 升级后旧日志可解析。
7. 不设 `approval_id` 字段：审批实体主键留在 pong，协议关联靠 `parent_id`。

## 9. 校验与测试

```bash
pnpm --filter @pong/agent-protocol test       # vitest
pnpm --filter @pong/agent-protocol typecheck  # tsc --noEmit
pnpm --filter @pong/agent-protocol lint       # eslint (backend config)
```

覆盖：信封必填/未知字段/ULID/幂等键/notes 上限；6 种 kind 的 accept/reject；artifact URI 往返、哈希确定性与篡改检测、manifest 约束；handoff 阈值边界、多文件、保真优先级、参数校验。
