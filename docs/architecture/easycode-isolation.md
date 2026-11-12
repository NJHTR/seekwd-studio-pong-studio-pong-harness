# easyCode 隔离与 read 边界（M1）

> 状态：M1 措施已实现（per-run home + 清理 + 回归测试）；OS 级严格隔离进入 M4 决策。
> 证据：`docs/poc/m1-ab-baseline.md`（large-A 两臂出现越界读）、`docs/poc/m0-fault-injection.md`（共享 home 并发/SQLite 竞争）。
> 本文只写隔离边界与选型；M1-B 的 `system-agents/easycode` 实现不在此改动，runtime 只提供 API。

## 1. 结论摘要

1. **easyCode 的 `workspaceWrite` 只限制写，不限制读**。agent 可以读任意绝对路径（同 OS 用户权限内）。
2. 共享 `EASYCODE_HOME` 时，consumer 能从兄弟 agent 的 rollout JSONL / session 日志恢复 handoff 变更值。M1 A/B 的 large-A 因此出现 2 次污染 run。
3. M1 已落地：**默认 per-run home**（每次 run 独立 `EASYCODE_HOME`，跑完/失败/崩溃都删除），加 stale TTL 清理与泄漏回归测试；host 侧配合“producer workspace 用后即删”。
4. 这能阻断**跨 run**恢复路径，但不能阻断**同用户、并发、仍在运行**的进程互读，也不能阻断 agent 主动读宿主文件。严格读隔离需要 OS 边界，建议 M4 采用**独立低权限用户 + ACL（最小方案）**或 **AppContainer/Job Object 组合**；Windows Sandbox / 容器仅用于不可信第三方工具。
5. 本地单用户桌面语境下，“agent 读宿主文件”的**可接受性取决于是否存在 prompt injection 与宿主密钥**。存在 pong API key、`~/.ssh`、浏览器数据时，纯文件系统白名单是必要的，不能只靠“用户自己负责”。

## 2. 威胁模型

### 2.1 资产

| 资产 | 位置 | 影响 |
|---|---|---|
| handoff 变更值（producer 产物） | producer rollout JSONL / session 日志 / artifact 文件 | A/B 结论失真、consumer“作弊”绕过 handoff |
| 会话历史与工具输出 | `<EASYCODE_HOME>/sessions/**`、`history.jsonl`、`rollout-*.jsonl` | 跨 agent 信息泄漏，违反多 agent 边界 |
| 模型凭据 | `<EASYCODE_HOME>/auth.json`、config token、环境变量 | 账号盗用/计费 |
| pong 数据与密钥 | pong DB、`PONG_API_KEY`、加密密钥、日志 | 本地数据泄漏；若 agent 有网则外传 |
| 宿主私有文件 | `~/.ssh`、浏览器 profile、用户文档、其它项目 | 隐私/供应链攻击 |
| 其它 agent 的 workspace | 各自 run 目录 | 跨任务污染 |

### 2.2 对手/失败模式

| ID | 模型 | 现状 | M1 后 |
|---|---|---|---|
| A1 | **兄弟 agent（正常模型）** 探索临时目录/session，读到已完成的 handoff | 可发生（A/B 已实测） | **阻断**：旧 run home 已删除；producer workspace 由 host 用后即删 |
| A2 | 并发 agent 读**仍在运行**的兄弟 home/workspace | 可发生 | **仍可发生**（同用户），需 OS 隔离或串行调度 |
| B1 | 被 prompt injection 的 agent 主动读宿主任意文件 | 可发生（读不受限） | **仍可发生**；需要 OS 级 ACL |
| B2 | agent 外传读到内容（网络） | `networkAccess:false` + 审批；但可写脚本后由用户命令外传 | 取决于审批策略与 `networkAccess` |
| C1 | agent 写 workspace 之外的文件 | `workspaceWrite` 阻止；用户审批可升级 | 同左；审批仍是边界 |
| C2 | agent 通过 MCP/插件扩大能力 | 取决于注册的工具与审批 | M1-B/M2 需审 MCP 白名单 |
| D1 | 多 OS 用户/多租户互相读 | 当前产品为本地单用户，不承诺 | M4 若做多用户需 OS 账号隔离 |
| E1 | 残留数据（崩溃、宿主 kill） | 旧 home 会留在磁盘 | **缓解**：崩溃清理 + 启动时 stale TTL 24h 清理 |
| E2 | 日志/临时目录泄漏 | `%TEMP%` 其它目录 | 部分：per-run home 内日志随 home 删除；进程 stderr 另需 host 管理 |

### 2.3 可接受 / 不可接受（本地单用户）

- **可接受**：同一用户能读自己机器的文件（这是桌面应用的默认前提）；agent 读模型配置与工作区。
- **不可接受**：
  1. 一个 agent 能恢复另一个 agent 的 handoff 数据（破坏多 agent 边界与 A/B 有效性）。
  2. agent 在无审批情况下读取宿主密钥（`~/.ssh`、pong 凭据、浏览器数据）并可能外传。
  3. run 结束后会话数据继续留在共享目录，供后续 run 读取。
- **条件性可接受**：并发 agent 互读各自 workspace（若产品明确“同一任务内协作”）；否则应串行或 OS 隔离。

## 3. M1 当前措施

### 3.1 已实现（`@pong/easycode-runtime`）

| 措施 | 实现 | 验收 |
|---|---|---|
| per-run `EASYCODE_HOME` | `createRunHome()` / `homeMode:'per-run'`（默认） | `test/run-home.test.ts`、`test/isolation.test.ts` |
| 播种凭据、不继承会话 | 只复制 `config.toml` / `auth.json` / `installation_id`；不复制 `sessions/`、`history.jsonl` | 同上 |
| 成功/失败/崩溃清理 | `shutdown()`、init 失败、child 意外退出均删除 home | `isolation.test.ts`：crash cleanup / init-failure cleanup |
| stale 清理 | 启动时删除 24h 前的 `run-*` home；`PONG_EASYCODE_RUNS_ROOT` 可配 | `run-home.test.ts` TTL、`isolation-smoke.mjs` |
| 泄漏回归 | fake server 在 home 写 rollout JSONL，run 结束后路径不可达 | `isolation.test.ts` regression |
| 并发不共享 | 两个 supervisor 并发启动得到不同 home，结束后都删除 | `isolation.test.ts`、`isolation-smoke.mjs` |
| 日志隔离 | 每 run 的 sessions/logs 在独立 home，随 home 删除 | 同上 |

API：

```ts
createRunHome({ baseHome?, runsRoot?, runId?, staleTtlMs? }): Promise<EasyCodeRunHome>
cleanupRunHome(runHome | homeString): Promise<void>
cleanupStaleRunHomes({ runsRoot?, staleTtlMs?, now? }): Promise<StaleRunHomeCleanupResult>
// supervisor: homeMode 'per-run' | 'per-agent' | 'shared'（默认 per-run）
//             runsRoot / runHomeTtlMs / runHomePath / healthCheck().runHome
```

### 3.2 host 必须配合的措施

1. **producer workspace 用后即删**（A/B 已手工验证有效）。runtime 只负责 home；workspace 生命周期在 system-agents/host 层，M1-B 需要把“删除 producer workspace”做成显式步骤，并在删除前记录 artifact。
2. consumer 的 workspace 只放 handoff 所需文件；不要复用上一轮目录。
3. 长会话/断点续跑若必须跨 supervisor 重启，选择 `shared`/`per-agent` 并接受残余读风险；默认 per-run 会丢 rollout，`thread/resume` 跨重启不可用。
4. 审计：记录 `runHomePath`、删除结果、agent 发起的绝对路径读（如工具输出可观测）；A/B/回归用 fake server 与真实运行双轨。

### 3.3 未覆盖（残余风险）

- **同用户并发互读**：per-run 只保证“不同目录、跑完删除”，不阻止仍在运行的 agent 读兄弟 home（路径可猜/可遍历 `%TEMP%/pong-easycode-runs`）。严格隔离需 OS 边界或串行调度。
- **任意宿主文件读**：prompt injection 下 agent 可读任何用户可读文件；`workspaceWrite` 无效。
- **环境变量**：子进程继承宿主 env；`PONG_*`/API key 可能被读。M4 应最小化子进程 env。
- **崩溃残留**：宿主被 SIGKILL/断电时删除逻辑不执行；stale TTL 是兜底，期间数据仍在磁盘。
- **日志/内存**：stderr 与 Node 宿主日志可能含敏感输出，需 host 侧脱敏。
- **Windows 平台**：服务端存活时 workspace/home 目录可能 `EBUSY`，清理需重试或等进程退出（见 `m0-fault-injection` F5）。

## 4. OS 级隔离选型

| 方案 | 读隔离 | 写隔离 | 兼容性/复杂度 | 冷启动 | 适用 |
|---|---|---|---|---|---|
| 现状：workspaceWrite + 审批 | ❌（仅写） | ✅（+审批升级） | 低 | 低 | 当前 M1 本地单用户 |
| **独立本地用户 + ACL**（easyCode 子进程以第二个 OS 用户运行，pong 数据/其它 home 拒绝该用户） | ✅（ACL 可精确到目录） | ✅ | 中：安装/服务/凭据/跨用户临时目录；离线可 | 中（登录/令牌） | **M4 推荐最小严格方案** |
| AppContainer / 受限令牌（Windows 能力 SID + ACL） | ✅（低完整性/能力限制） | ✅ | 中高：easyCode 需访问模型配置、临时目录、网络；需逐项授权 | 中 | M4 备选，需与 easyCode Windows sandbox 兼容性验证 |
| Windows Sandbox（VM） | ✅（强，完整 VM） | ✅ | 高：Pro/Enterprise、交互式窗口、共享文件夹是泄漏通道、不可无头嵌入 | 高（数十秒） | 不可信第三方工具/MCP 的隔离执行，不适合每 turn |
| WSL2/Hyper-V 容器 per agent | ✅（mount 边界） | ✅ | 高：WSL 依赖、镜像/网络/凭据注入、桌面分发复杂 | 中高 | M4 之后的“不可信代码执行” |
| Docker Desktop 容器 | ✅ | ✅ | 高：依赖 Docker、安装包体积、离线镜像 | 高 | 开发/CI，不作为桌面默认 |

补充：现有 **Windows Job Object** 只保证进程树清理，不是安全边界；M1 的 Rust supervisor 继续复用。

## 5. M4 决策建议

1. **默认（M1 保持）**：per-run home + host 删除 producer workspace + 串行多 agent handoff；文档明确“读隔离未解决”。
2. **M4 主线（推荐）**：
   - 安装器创建专用低权限本地用户（如 `pong-agent`），easyCode 子进程通过该用户运行（Windows 计划任务/服务或 CreateProcessWithToken）。
   - ACL：`pong` 数据目录、用户主目录（除 workspace 与模型配置副本）拒绝该用户；每 run workspace 在 `%ProgramData%` 下按 run 建目录并授权。
   - 模型凭据：复制到 agent 用户可读的 per-run 配置（或 token broker），不暴露宿主 `auth.json` 全量。
   - 子进程 env 白名单化（不继承 `PONG_*`/云凭据）。
3. **M4 备选（若独立用户不可行）**：AppContainer + capability 白名单；先做 POC 验证 easyCode 的临时目录、模型 catalog、PTY 在 AppContainer 内可用。
4. **不可信第三方工具**：单独 Windows Sandbox/容器路径，不进入默认 agent 执行链。
5. **验收方法（M4 门禁）**：
   - 同一泄漏回归：consumer 读取上一 run home/rollout 路径必须失败（ACL 拒绝，而不仅是文件不存在）。
   - 宿主文件探测：agent 尝试读 `~/.ssh`、pong DB、其它用户 home，工具输出为 Access Denied 且审计记录。
   - 并发 4 agent × 10 min：无跨 run 泄漏、无 home 残留（stale=0）、Job Object 无孤儿。
   - 清理：SIGKILL/断电模拟后，下次启动 stale 清理回收全部旧 home。
   - 冷启动预算：独立用户方案启用后，首 turn 时延增加 ≤ 500 ms（不含模型）。
6. **何时可以不做 OS 隔离**：若产品明确“单用户、无不可信 MCP/插件、无宿主密钥暴露、多 agent 串行”，可维持 M1 措施并在 UI 明示；一旦开放第三方 MCP、并行多 agent 或处理客户数据，必须升级到 M4 方案。

## 6. 实现引用

- `packages/@pong/easycode-runtime/src/run-home.ts`：`createRunHome` / `cleanupRunHome` / `cleanupStaleRunHomes`。
- `packages/@pong/easycode-runtime/src/supervisor.ts`：`homeMode`（默认 `per-run`）、`runsRoot`、`runHomeTtlMs`、`runHomePath`、崩溃/失败/关闭清理。
- `packages/@pong/easycode-runtime/README.md`：API 与 trade-off。
- `scripts/poc/isolation-smoke.mjs`：无 easycode/模型的 5 项 smoke。
- `docs/poc/m1-ab-baseline.md` §4：越界读证据；`docs/poc/m0-fault-injection.md` F5：Windows 删除约束。
