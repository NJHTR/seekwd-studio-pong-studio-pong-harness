# M1-C 审批链路契约（前后端并行依据）

- 状态：冻结（2026-11-13）
- 用途：后端（studio-architect）与前端（并行实现）按此契约对接，不再互相等待。

## 1. 后端 → 前端：host event

事件名：`easycode-approval-requested`

```json
{
  "type": "easycode-approval-requested",
  "payload": {
    "approvalId": "string",
    "threadId": "string",
    "turnId": "string",
    "itemId": "string",
    "requestKind": "command | fileChange | permissions | input",
    "title": "string",
    "detail": "string?",
    "command": "string?",
    "cwd": "string?",
    "reason": "string?",
    "availableDecisions": ["accept", "decline", "acceptForSession"],
    "expiresAtMs": 0,
    "question": "string?",
    "options": ["string"]
  }
}
```

- `expiresAtMs` 是 epoch 毫秒；前端据此显示倒计时，过期后禁用按钮并显示“未知结果”。
- `input` 类型用 `question`/`options`；`answers` 通过决策端点回传。

## 2. 前端 → 后端：决策端点

```
POST /agents/system/:agentId/threads/:threadId/approvals/:approvalId
Content-Type: application/json

{ "decision": "accept | decline | acceptForSession", "answers": { "<questionId>": ["answer"] } }
```

响应：

| 状态 | 含义 |
|---|---|
| 200 `{ "ok": true }` | 已接受决策（幂等：重复请求返回同一结果） |
| 404 | 审批不存在或不属于该 thread |
| 409 | 已决策 / 已超时（body 带 `state: "decided" | "expired"`） |

- 鉴权复用现有 system agent thread 访问检查（`systemAgents.getUsableThread`）。
- 路由加在现有 `system-agent-chat.controller.ts` 上，不新建模块/前缀。

## 3. 前端 UI 要求

- 挂到现有 `AgentPongChatView` 的 `interactionExtensions`，在现有聊天面板内渲染卡片。
- 复用设计系统组件与 i18n；不新建前端 feature。
- 卡片：标题（命令/文件变更/权限/需要输入）+ 详情 + 倒计时 + 按钮（批准/拒绝/本会话允许）。
- 决策后显示 pending/已完成；409 时显示“已失效”；过期显示“未知结果”。
- 输入类：渲染问题 + 选项/自由文本，提交走同一端点 `answers`。