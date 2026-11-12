# M1 A/B 重测：隔离 workspace + 固定 producer artifact + 两档 payload

> 状态：**有结论（条件性支持多 agent 协议）**。样本：small 臂 A/B 各 n=3（隔离干净）；large 臂 A n=3（其中 2 次返工时记录到越界读，见 §4）、B n=5（干净）。
> 数据来自真实 easycode + 真实 `@pong/easycode-runtime`（task-13 修复后）；未估算。Artifacts：`scripts/poc/.artifacts/m1ab-real-v2/`（small + large 首轮）、`m1ab-real-v3/`（large 复跑）。
> 只写 `scripts/poc/` 与 `docs/poc/`；未改 pong/runtime 业务代码。

## 1. 结论摘要

**结论：条件性支持多 agent 协议——只在 payload 超过 prose handoff 容量时支持；小 payload 不支持（净亏）。**

| Payload | 指标 | A（自由文本） | B（结构化 artifact） | 判定 |
|---|---|---|---|---|
| small（1 文件） | 首次通过 | **3/3** | **3/3** | 无差异；A 更便宜 |
| | consumer tokens 均值 | **46,571** | 83,665（+80%） | A 胜 |
| | 首 turn wall 均值 | **27.7 s** | 32.8 s（+19%） | A 胜 |
| | 返工 | 0 | 0 | — |
| large（10 文件 / 30 行 / ~1.7 KB diff） | 首次通过 | **0/3** | **5/5** | B 胜 |
| | 最终通过 | 2/3（均需 1 次返工；且返工时记录到越界读） | 5/5 | B 胜 |
| | consumer tokens 均值 | 804,041 | 140,929（约 1/5.7） | B 胜 |
| | 首 turn wall 均值 | 213.3 s（含 2 次 300 s 超时） | 61.6 s | B 胜 |
| | 返工 | 3 | 0 | B 胜 |

协议错误（`transport.protocolErrors`）：两档、两臂全部 **0**；审批请求 0。

净收益边界（本 fixture）：**1 个文件、3 行追加（约 180 B）**时，自由文本 ≤600 字符可以无损携带 → 结构化无收益且更贵；**10 个文件、30 行追加（约 1.7 KB diff）**时，prose 无法携带全部事实 → 自由文本首轮 0/3 通过，产生大额探索/返工成本，结构化 artifact 首轮全通过。

## 2. 实验设计

### 2.1 Fixture（确定性，seed=`pong-m1-ab-v1`）

- `small`：`repo/f01.txt`（5 行原文）；变更 = 末尾追加 3 行 `UPD_A/B/C: <24 hex>`。
- `large`：`repo/f01.txt`…`f10.txt`（各 5 行）；各追加 3 行（合计 30 行，约 1.7 KB diff）。
- 验收：consumer 把每个文件的最终内容写到 `out/<name>`；verifier 与 fixture 派生期望逐行比较（忽略行尾空白/CRLF）。

### 2.2 固定 producer artifact（两臂共用）

- 每个 payload 只跑 **1 次**真实 producer（easycode + deepseek-flash），产出 `change-artifact.json`（`artifact_id`/`parents`/`manifest[{path, old_sha256, old_lines, append_lines, new_sha256, diff}]`/`summary`）与 ≤600 字符 prose。
- 宿主机按 fixture 语义校验 artifact（manifest 覆盖、append_lines 与 changes.json 一致、diff 的 `+` 行一致）；本实验两次 producer 都**第 1 次即通过校验**，无重试、无 host-fallback。
- Producer 指标：small wall **31,550 ms** / **73,478 tokens** / prose **522 chars**；large wall **269,705 ms** / **194,070 tokens** / prose **514 chars**。

### 2.3 两臂（唯一变量 = handoff 表示）

| Arm | consumer 收到的 |
|---|---|
| **A** | 冻结的 producer prose 原文（“无 artifact 可用，只能依赖该 handoff”） |
| **B** | `{artifact_ref:{path,digest}, conclusion_proposed:{parents,summary,file_count,total_lines_added,digest}}` + `source/change-artifact.json` 副本 |

两臂 consumer prompt 除 SOURCE 段外逐字相同；首次失败允许 1 次修复 turn（计返工）。

### 2.4 隔离措施（以及实测能/不能）

- 每 run 独立 workspace 根（`%TEMP%\m1ab-consumer-*`）；producer workspace 在 prepare 后删除。
- 每 run 独立 `EASYCODE_HOME`（真实 home 的 config/auth 隔离种子 + task-13 `homeMode='per-agent'`），run 结束删除；**不在 run 之间复用 home**（M0 重测教训：共享 home 会让 consumer 从兄弟 agent 的 rollout JSONL 里找回变更值）。
- consumer 用 `workspaceWrite`（`writableRoots=[runRoot]`, `networkAccess:false`）。
- **不能禁止**：easyCode `workspaceWrite` 不限制读；绝对路径可读任意文件。因此脚本记录 `isolation`：`..` 遍历、producer 路径引用、`agents/`/`rollout-*`/`sessions/` 读取、root 外绝对路径。
- 实测：`..` 遍历 **0**；但 large 臂 A 的 2 次运行记录到 root 外/session 日志读取（`sessionLogReads` 1 与 5），见 §4。B 臂与 small 臂全部 0。

## 3. 数据表

### 3.1 逐 run（clean 行加粗，❌ 为被排除的污染 run）

| run | arm | 首通过 | 返工 | 最终 | consumer tokens | 首 turn wall | 总 wall | 隔离命中（session/root 外） |
|---|---|---|---|---|---|---|---|---|
| small-1-a | A | ✅ | 0 | ✅ | 56,359 | 32.9 s | 32.9 s | 0 / 0 |
| small-2-a | A | ✅ | 0 | ✅ | 41,545 | 25.5 s | 25.5 s | 0 / 0 |
| small-3-a | A | ✅ | 0 | ✅ | 41,810 | 24.6 s | 24.6 s | 0 / 0 |
| small-1-b | B | ✅ | 0 | ✅ | 89,979 | 33.1 s | 33.1 s | 0 / 0 |
| small-2-b | B | ✅ | 0 | ✅ | 73,923 | 32.1 s | 32.1 s | 0 / 0 |
| small-3-b | B | ✅ | 0 | ✅ | 87,093 | 33.2 s | 33.2 s | 0 / 0 |
| large-3-a (v2) | A | ❌ | 1 | ❌ | 94,244 | 39.7 s | 51.1 s | 0 / 0 |
| large-1-a (v3) | A | ❌ | 1 | 🟡 | 735,725 | 300.2 s（超时） | 597.5 s | 1 / 1 |
| large-2-a (v3) | A | ❌ | 1 | 🟡 | 1,582,154 | 300.2 s（超时） | 340.8 s | 5 / 5 |
| large-1-b (v2) | B | ✅ | 0 | ✅ | 127,320 | 46.9 s | 46.9 s | 0 / 0 |
| large-2-b (v2) | B | ✅ | 0 | ✅ | 121,812 | 49.6 s | 49.6 s | 0 / 0 |
| large-3-b (v2) | B | ✅ | 0 | ✅ | 218,576 | 117.7 s | 117.7 s | 0 / 0 |
| large-1-b (v3) | B | ✅ | 0 | ✅ | 121,739 | 41.5 s | 41.5 s | 0 / 0 |
| large-2-b (v3) | B | ✅ | 0 | ✅ | 115,198 | 52.2 s | 52.2 s | 0 / 0 |
| ~~large-1-a (v2)~~ | A | ✅ | 1 | ✅ | 771,831 | 73.9 s | 171.4 s | **5 / 5（污染，排除）** |
| ~~large-2-a (v2)~~ | A | ✅ | 0 | ✅ | 973,949 | 274.7 s | 274.7 s | **5 / 5（污染，排除）** |

说明：v2 的两次 large-A 首轮在旧版共享 home / 上一轮残留的 session 日志上命中（M0 重测时有同样问题）。v3 已清空残留、每 run 独立 home 后重跑 large；v3 的 A 仍记录到 session 日志读取（其 rework 通过发生在越界读之后），因此 large-A 只有 v2 的 `large-3-a` 是**完全隔离的失败样本**；另外 2 次作为“非隔离下半结论”：首轮均失败、且需要 1 次返工，返工过程伴随越界读。

### 3.2 汇总（clean 子集）

| | small A (n=3) | small B (n=3) | large A (n=3*) | large B (n=5) |
|---|---|---|---|---|
| 首次通过 | 3/3 | 3/3 | 0/3 | 5/5 |
| 最终通过 | 3/3 | 3/3 | 2/3（返工后） | 5/5 |
| 返工总次数 | 0 | 0 | 3 | 0 |
| tokens 均值 | 46,571 | 83,665 | 804,041 | 140,929 |
| tokens 中位数 | 41,810 | 87,093 | 735,725 | 121,739 |
| 首 turn wall 均值 | 27.7 s | 32.8 s | 213.3 s | 61.6 s |
| 首 turn wall 中位数 | 25.5 s | 33.1 s | 300.2 s | 49.6 s |
| 协议错误 | 0 | 0 | 0 | 0 |

\* large A 的 n=3 中只有 1 次完全隔离；另 2 次为“隔离未遂、返工伴随越界读”。若严格要求完全隔离，large A 的有效样本 = 1（该样本首轮+返工均失败）。

## 4. 方差与威胁

1. **模型方差大**：large B 的 consumer tokens 115k–219k（1.9×）、wall 41.5–117.7 s（2.8×）；large A 的 tokens 94k–1,582k（16.8×）、wall 51–597 s。token 是“累计重发上下文”，一次探索多 10 次工具调用就会翻倍，因此均值仅作量级参考，中位数更稳。
2. **A 在 large 上的失败方式**：prose 不含逐文件值 → 模型先尝试探索（`rg`/`Get-ChildItem` 全盘/临时目录/旧 session），2/3 次触到 300 s turn 超时；一次完全隔离的样本（`large-3-a`）首轮与返工都失败。这说明 free-text 路线在 payload 超容量时不是“稍差”，而是**不可控的成本爆炸**。
3. **读隔离无法用 easyCode 沙箱强制**：`workspaceWrite` 只约束写。本实验用“每 run 独立 home + 删除 producer workspace + 检测”缓解，仍能观测到 A 读自己/旧 session 日志。若后续要统计意义上的严格对照，需要 OS 级隔离（独立用户/沙箱/容器或只读沙箱 + workspace 白名单）。
4. **样本量**：small 每臂 3、large B 5、large A 有效隔离样本 1。3/3 vs 0/3 的方向性很强（Fisher 精确检验单侧 p≈0.05 量级，仅作参考），但不足以给出精确收益比例；如需统计结论，建议 **≥10 次/臂/档**，且全部通过隔离校验。
5. **fixture 代表性**：payload 是“追加行 + diff”，验证按字节/行精确比较；真实任务多为代码 patch，diff 更大，A 的劣势只会更强，B 的优势方向不变。

## 5. 结论与建议

**是否支持多 agent 协议：条件性支持。**

- **支持**：当 handoff 需要传递的数据超过 prose 容量（本实验阈值：> 约 1 个文件 3 行 / ~180 B），或要求逐字段无损（diff/哈希/manifest）时，**必须用结构化 artifact 引用 + conclusion**。本实验 large：A 首轮 0/3、B 首轮 5/5；B 的 token 约 A 的 1/5.7、首轮时延约 1/3.5，且 A 会触发 300 s 超时。
- **不支持（当前形态）**：小 payload（≤prose 容量）用结构化 artifact 没有收益，反而 **+80% tokens / +19% 时延**（多一次读 artifact 与结构化解析）。这类任务保留单 agent 自由文本 handoff 即可。
- **产品化建议**：协议层做**自适应**——host 按“需要传递的权威数据量 / 是否可压缩总结 / 是否要求逐字节保真”选择 handoff 形态；默认自由文本，超阈值（例如序列化 >~500 字符或含 diff/manifest）升级为 artifact 引用。不要一刀切要求所有 agent 间通信都用结构化协议。
- **M1 内必须先修**：读隔离（OS 级或等价）与 session 日志隔离；否则“consumer 可以在旧 session 里搜到 handoff 数据”会让任何 A/B（以及 A2A 安全边界）失真。当前 easyCode 的 `workspaceWrite` 不提供读隔离。

## 6. 复现命令

```powershell
$node = "C:\Users\NJHTR\IdeaProjects\seekwd\.tools\node24\node.exe"
cd C:\Users\NJHTR\IdeaProjects\seekwd\pong-studio

# CI 接线检查（fake server，无模型；本次 smoke 全通过）
& $node scripts/poc/m1-ab-baseline.mjs --smoke

# 真实：冻结 producer artifact（每 payload 一次）
& $node scripts/poc/m1-ab-baseline.mjs --real --prepare-only --payload both --out-dir scripts/poc/.artifacts/m1ab-real

# 真实：消费 run（A,B,A,B,…，复用固定 artifact；--payload both|small|large）
& $node scripts/poc/m1-ab-baseline.mjs --real --runs 3 --payload both --out-dir scripts/poc/.artifacts/m1ab-real
```

产物：`fixed/<payload>/change-artifact.json` + `handoff-prose.txt` + `meta.json`（producer 指标）；`runs/<payload>-<n>-<arm>.json`（命令、isolation、token、verifier）；`summary.json`（聚合）。`--force-prepare` 可重跑 producer；`M1AB_REAL=1` 等价于 `--real`。

## 7. 交付物

| 路径 | 说明 |
|---|---|
| `scripts/poc/m1-ab-baseline.mjs` | 本实验：fixture、producer 冻结、两臂消费、verifier、隔离检测、`--smoke` |
| `scripts/poc/poc-lib.mjs` | 宿主封装（新增 per-agent home 透传） |
| `scripts/poc/fake-app-server.mjs` | fake server（smoke 用，新增 FAKE_WRITE_FILES_JSON） |
| `docs/poc/m1-ab-baseline.md` | 本文件 |
