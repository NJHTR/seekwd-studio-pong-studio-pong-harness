# Pong Studio

Pong Studio 是一个本地优先的可视化工作流与 AI Agent 编排工作台，用于毕业设计研究。

## 这是什么

- **可视化编排**：在画布上连接节点，构建可执行的工作流
- **AI 能力**：LLM 节点、Agent 节点、工具调用、MCP 接入
- **本地运行**：Node.js + SQLite，单进程启动，数据保存在本机
- **可扩展**：400+ 内置集成节点，支持自定义节点与插件

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js 24 · TypeScript · Express · TypeORM · SQLite/PostgreSQL |
| 前端 | Vue 3 · Vite · Pinia · Vue Flow |
| 构建 | pnpm workspace · Turbo |

## 快速开始

```bash
# 依赖（Node >= 24，pnpm >= 12.4.2）
pnpm install
pnpm build

# 启动
node packages/cli/bin/pong start
```

打开 http://localhost:5678

本地开发：

```bash
pnpm dev:be        # 后端，热重载
pnpm dev:fe:editor # 前端编辑器，热重载
```

## 仓库结构

```
packages/
  cli/          后端服务（REST API、webhook、队列、CLI）
  core/         工作流执行引擎
  workflow/     图模型、节点类型、表达式
  nodes-base/   内置集成节点
  frontend/     Vue 3 编辑器与设计系统
  @pong/        AI、数据库、运行时等共享包
```

## 配置

环境变量以 `PONG_` 为前缀，例如：

```
PONG_USER_FOLDER=./data
PONG_PORT=5678
PONG_DIAGNOSTICS_ENABLED=false
```

## 说明

本项目用于课程/毕业设计，在本地运行与演示，不对外提供服务。
