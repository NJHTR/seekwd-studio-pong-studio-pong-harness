# M1-C 真机审批往返记录（easyCode 真实二进制）

- 日期：2026-11-13
- 环境：Windows，真实 `easycode.exe`（`resolveDefaultExePath()`），临时 git 仓库
- 开关（仅测试）：`PONG_EASYCODE_REAL_E2E=1`、`PONG_EASYCODE_APPROVAL_POLICY=untrusted`（沙箱 `workspace-write`，默认）
- 用例：`packages/cli/src/modules/agents/system-agents/easycode/__tests__/easycode-real-app-server.test.ts`
- 结果：**通过**（vitest 1 passed，~34–91 s 含模型执行）

## 1. 任务提示词

```
You must use the shell to run exactly this command in the current directory:
node -e "console.log('pong-approval-e2e')"
After the command succeeds, reply with the single word DONE. Do not change any file.
```

## 2. host event 序列（真实）

```
easycode-thread-forked        (首次：无 state → fork 事件，符合预期)
easycode-item-started
raw:item/completed            (userMessage)
easycode-item-completed
easycode-item-started
easycode-approval-requested   ← 命令审批卡片事件
easycode-approval-decided     ← 经决策端点（controller handler）accept
raw:item/completed            (commandExecution, exitCode 0, output "pong-approval-e2e\n")
easycode-item-completed
easycode-item-started
raw:item/completed            (agentMessage "DONE")
easycode-item-completed
raw:turn/completed            (status completed, durationMs 23654)
```

app-server notification 序列（节选）：

```
turn/started
item/started                 (commandExecution)
serverRequest/resolved       ← 审批应答在同一连接上完成
item/commandExecution/outputDelta
item/completed               (commandExecution)
item/agentMessage/delta ×2
turn/completed
```

## 3. 审批往返

| 字段 | 值 |
|---|---|
| approvalId | `0:call_00_ET_K8Bj0KtUqXoFlgncnxiV2146` |
| kind | `commandExecution` |
| command | `"…powershell.exe" -Command "node -e \"console.log('pong-approval-e2e')\""` |
| 决策 | `accept`（经 `SystemAgentChatController.decideApproval`，与 HTTP 端点同一 handler） |
| 往返耗时 | **0 ms**（in-process 调用；网络层未计） |
| 命令结果 | `exitCode: 0`，`aggregatedOutput: "pong-approval-e2e\n"`，`durationMs: 71` |
| turn 结果 | `completed`，`finishReason: stop`，模型回复 `DONE` |

## 4. 判定与限制

1. **`untrusted` 是有效触发器**：真实二进制在该策略下对每条 shell 命令发 `item/commandExecution/requestApproval`；此前 `read-only` 只让写失败，不产生审批（已废弃该路径）。
2. 决策走 `EasycodeApprovalRegistry` → `EasycodeApprovalBridge.resolve` → `supervisor.decideApproval`，应答在同一 app-server 连接上（`serverRequest/resolved` 可见），turn 在批准后继续并正常完成。
3. 本记录是**后端链路真机证据**：端点 handler 为 in-process 调用，HTTP 传输层由既有 controller 装饰器负责，未在本用例中启真实 HTTP 客户端；前端卡片由并行任务验收。
4. artifact：本任务不产生 fileChange（提示词要求不改文件）；artifact 落库路径由 `EasycodeAttachmentArtifactSink` + `AgentChatAttachmentService.storeInbound` 单测覆盖（sha256/contentHash/fileId），真机 artifact 需在写文件任务中另行取证。

## 5. 复现命令

```powershell
$env:PONG_EASYCODE_REAL_E2E='1'
pnpm --filter pong exec vitest run "src/modules/agents/system-agents/easycode/__tests__/easycode-real-app-server.test.ts" --maxWorkers=1 --silent=false
```
