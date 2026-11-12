# M0-5 A/B 基线：自由文本 handoff vs 结构化 artifact 引用 + conclusion

> 状态：**数据不足，不下结论**。本文件记录已完成的试验设计、真实运行数据与偏差。
> 全部数字来自真实 easycode + 真实 `@pong/easycode-runtime` 的运行，未估算。Artifacts 在
> `scripts/poc/.artifacts/ab-pilot/`、`ab-pilot2/`（已 gitignore）。
> 样本：A 臂 n=2（其中 1 次在隔离修正前，污染），B 臂 n=1；**远低于每臂 ≥3 次的要求**。

## 1. 结论摘要

| 项 | 结果 |
|---|---|
| 能否据此决定“值不值得做多 agent 协议” | **不能**。每臂样本 < 3，且 A 臂 1 次污染、A/B 的 producer 耗时/token 方差极大 |
| 方向性观察（不是结论） | 结构化 artifact 臂（B）首次通过 1/1；自由文本臂（A）首次通过 0/2，均需 1 次返工。A 的 handoff 是 368–514 字符的散文，不含 10 个文件的逐项 token，无法完成精确任务 |
| 成本结构观察 | 本实验中 producer turn 主导成本（94,380–324,331 tokens，40.4–233.2 s），handoff 本身仅 190–514 字符；A 的一次返工额外花 26,326–54,772 ms / 245,348–274,752 tokens |
| 阻塞复跑的问题 | ① `workspaceWrite` 沙箱**不限制读**，A 臂可遍历 `..` 找到 producer workspace（已记录命令）；② 本机 schema 偏差（见 `m0-fault-injection.md` F2）导致首轮 6/6 失败，修正后才跑通 |
| 建议 | M1 前补做：每臂 ≥3 次、强制 workspace 隔离（读侧沙箱或独立进程/临时根目录）、同条件交替执行；然后才用数据决定协议形态 |

## 2. 实验设计

### 2.1 任务（两阶段，两个 arm 的 producer 完全相同）

- Fixture：`src/` 下 10 个 `.txt`，每个含 1 个 `TOKEN: <8 字符>` 行和 0–3 个以 `#` 开头的注释行；`totalCommentLines=25`（由 verifier 从文件字节解析，不硬编码）。
- **Producer（analysis agent）**：读全部文件，写 `findings.json`（每个文件的 token + 注释行数 + 总数），然后只用 **≤120 词的自然语言**回复 handoff。
- **Consumer（implementation agent）**：按 handoff 写 `answer.json`（与 `findings.json` 同结构），verifier 与 ground truth 逐字段比较；首次失败给 **1 次修复 turn**，计为返工。

### 2.2 两种 handoff 描述（唯一变量）

| Arm | Consumer 收到的内容 |
|---|---|
| **A（自由文本）** | producer 最终 `agentMessage` 原文（368–514 字符散文），提示“不能读 analysis agent 的文件，只能依赖该 handoff” |
| **B（结构化）** | `{artifactPath, sha256, conclusion:{status, fileCount, totalCommentLines}}`，其中 artifact 是 producer 的 `findings.json` 拷贝（190 字符 JSON）；提示“读 artifactPath，它是唯一事实来源” |

### 2.3 指标与采集

- **token**：`thread/tokenUsage/updated` 的 `total` 在每 turn 内的增量（`turnTotalDelta`），分 producer / consumer / 总 tokens。
- **时延**：每 turn `wallMs`（宿主时钟，含模型时间），分 producer / consumer / 返工。
- **成功率**：首次通过率、最终通过率。
- **返工次数**：首次失败后实际执行的修复 turn 数（上限 1）。
- **污染检测**：记录 consumer 的 command items；A 臂出现访问 `producer-ws` / `src` 的命令即标记 `handoffOnlyViolation`。
- 运行：同一 app-server 进程内两个 thread（producer cwd / consumer cwd 分离）；审批回调 auto-accept（本实验未触发审批，`approvalRequests=0`）；每 run 使用隔离 `EASYCODE_HOME`。

### 2.4 隔离修正（试验中途变更，必须披露）

- `ab-pilot`（A 臂 1 次）：producer workspace **未删除**。consumer 用 `Get-ChildItem ..` 发现了同级 `producer-ws`，属污染。
- `ab-pilot2`（A、B 各 1 次）：producer turn 后删除 `findings.json` 与 `src/`（保留空的 producer-ws 根目录，因为服务端持有 cwd 句柄，见 `m0-fault-injection.md` F5）。但 A 臂仍执行了 `cmd /c dir /a /s …\producer-ws` 等搜索命令并标记违规；其返工通过，**无法排除残留文件/搜索**，按“疑似污染”处理。

## 3. 实测数据

### 3.1 逐次运行

| run | arm | 隔离 | producer artifact 正确 | 首次通过 | 返工 | 最终通过 | producer tokens | consumer tokens | 总 tokens | producer wall | consumer wall | 返工 wall | handoff 字符 | 文件系统违规 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ab-pilot/run-1-a` | A | 否（污染） | 是 | 否 | 1 | 是 | 292,309 | 274,752 | 567,061 | 79,660 ms | 33,216 ms | 43,480 ms | 514 | 是（遍历 `..` / `src`） |
| `ab-pilot2/run-1-a` | A | 是（内容已删） | 是 | 否 | 1 | 是 | 94,380 | 245,348 | 339,728 | 40,359 ms | 26,326 ms | 54,772 ms | 368 | 是（搜索 `producer-ws`） |
| `ab-pilot2/run-1-b` | B | 是 | 是 | **是** | 0 | 是 | 324,331 | 103,091 | 427,422 | 233,217 ms | 168,927 ms | 0 | 190 | 0 |

首次失败原因（A 两次相同）：`answer.json is missing`——consumer 花时间探索文件系统，未先落 `answer.json`；返工后才写。B 首次即通过：读 `consumer-ws/artifacts/findings.json` 后复制/校对。

### 3.2 汇总

| 指标 | A（n=2，1 次污染） | B（n=1） |
|---|---|---|
| 首次通过 | 0/2 | 1/1 |
| 最终通过 | 2/2 | 1/1 |
| 返工 turn 总数 | 2 | 0 |
| producer tokens（均值） | 193,345（94,380 / 292,309） | 324,331 |
| consumer tokens（均值） | 260,050 | 103,091 |
| 总 tokens（均值） | 453,395 | 427,422 |
| producer wall（均值） | 60,010 ms | 233,217 ms |
| consumer wall（均值） | 29,771 ms | 168,927 ms |
| handoff 字符（均值） | 441 | 190 |
| producer artifact 正确率 | 2/2 | 1/1 |

### 3.3 `--smoke`（CI 接线检查，非实验数据）

`node scripts/poc/ab-baseline.mjs --smoke`：fake app-server、每臂 1 次、各 ~0.3 s，A/B 均 PASS；token 为 fake 固定值。仅证明脚本/verifier/汇总可运行，**不能**作为协议结论。

## 4. 为什么“不足以下结论”

1. **样本量**：要求每臂 ≥3 次，实际 A=2、B=1。B 只有 1 次，成功率 1/1 的置信区间极宽。
2. **A 臂污染**：2 次 A 都尝试访问 producer workspace；隔离只能删文件、不能在 `workspaceWrite` 沙箱里禁止读，A 的最终成功不能证明它只用了自由文本。
3. **同任务异方差**：producer 提示词完全相同，但 producer 耗时 40.4 s vs 233.2 s、tokens 94,380 vs 324,331（约 3.4×）。在 n=1 的 B 上，token/时延差异主要来自模型与工具调用序列，不是 handoff 形式。
4. **设计在试验中途修改**（增加 workspace 清理），两组数据不完全同条件。
5. **A 的 payload 上限**：A 的 handoff 被限定 ≤120 词，10 文件 ×（8 字符 token + 注释数）无法完整放入；A 失败是设计使然，符合“自由文本是有损压缩”的假设，但也意味着该实验测的是**该 payload 规模下的保真度**，不能外推到所有任务。

## 5. 建议的 M1 补测方案（未执行）

1. **强制隔离**：consumer 使用独立进程 + 独立临时根目录；或给 easycode 的 consumer thread 配置读侧限制（若支持）；至少要能证明 consumer 的 command/文件访问不包含 producer 路径。当前 runtime 只能做到“删除源文件”，不够。
2. **固定 producer 产物**：把 producer 的 `findings.json` 预先生成成固定 artifact，先测“handoff 表示”本身（去掉 producer 方差）；再单独跑端到端。
3. **每臂 ≥3 次，交替顺序**（A,B,A,B,…），记录全部样本与中位数；样本 <5 时同时给出原始值，不报均值。
4. **同时测小 payload**（2 文件）与**超 prose 容量 payload**（10+ 文件），得出“结构化 handoff 在什么规模开始有净收益”的边界，而不是笼统回答“值不值得”。
5. 修正 `networkAccess` 类型（F2）后重跑，避免脚本绕过类型。

## 6. 复现命令与产物

```powershell
$node = "C:\Users\NJHTR\IdeaProjects\seekwd\.tools\node24\node.exe"
cd C:\Users\NJHTR\IdeaProjects\seekwd\pong-studio

# CI 接线检查（fake server，无需 easycode/模型）
& $node scripts/poc/ab-baseline.mjs --smoke

# 真实运行（本文件数据：pilot 1 次/臂；pilot2 1 次/臂）
& $node scripts/poc/ab-baseline.mjs --runs 1 --out-dir scripts/poc/.artifacts/ab-pilot2
& $node scripts/poc/ab-baseline.mjs --runs 1 --arm a --out-dir scripts/poc/.artifacts/ab-pilot

# 目标方案（每臂 3 次；本任务时间不足未执行完）
& $node scripts/poc/ab-baseline.mjs --runs 3 --out-dir scripts/poc/.artifacts/ab-final
```

产物：`summary.json`（runs + aggregate）、`run-<n>-<arm>.json`（producer/handoff/consumer/verifier/token 全量）、每 run 的 `events.jsonl` / `stderr.log`。

## 7. 交付物

| 路径 | 说明 |
|---|---|
| `scripts/poc/ab-baseline.mjs` | 两阶段 A/B、verifier、token/时延/返工统计、`--smoke` |
| `scripts/poc/poc-lib.mjs` | 宿主封装、token 采集、隔离 home（两脚本共用） |
| `scripts/poc/fake-app-server.mjs` | fake server（供 A/B 与 fault 的 `--smoke` 使用） |
| `docs/poc/m0-ab-baseline.md` | 本文件 |
