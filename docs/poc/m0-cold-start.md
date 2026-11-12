# M0 冷启动测量与 M3 预热方案（pong sidecar）

- 状态：测量完成；根因已定位；预热方案按实测收益排序
- 日期：2026-11-13
- 环境：Windows 11 x64（NT 10.0.26200）、Node **v24.22.2**（`seekwd/.tools/node24/node.exe`）、pnpm 12.4.2、仓库 `pong-studio`（pnpm workspace）
- 启动命令：桌面监督器契约 `node packages/cli/bin/pong start`，环境变量同 `supervisor/src/pong.rs`（`PONG_PORT`/`PONG_LISTEN_ADDRESS=127.0.0.1`/`PONG_USER_FOLDER`/桌面基线开关），端口取随机空闲端口
- 所有数字来自本文 §8 的脚本在本机的实际运行；"预计收益"单独标注为估算的部分不是实测

## 1. 结论摘要

| 问题 | 结论 |
|---|---|
| 首启慢在哪 | **不是 DB 迁移**。预热后启动到 `/healthz` 的 4 s 里约 3.5 s 是 CJS 模块图加载（**8,962 个 JS 文件、46.2 MB**）；到 `/healthz/readiness` 的另外 4 s 里约 1.6 s 是编辑器静态资源处理（1,258 个文件 / 65.9 MB → 缓存 1,176 个文件 / 74.2 MB）与模块初始化 |
| 首次启动（空用户目录）额外成本 | **+2.4 s**（ready 10.36 s vs 二次启动 7.97 s），其中 SQLite 迁移约 2.07 s |
| >5 min 冷启动的可解释机制 | 本机 **Defender 实时防护 + 篡改保护开启**，且无法在非管理员下查看排除项；首次访问 8,962 个 JS 文件 + 1,258 个静态资源 + 写入 1,176 个缓存文件时，每个文件都要经过杀软扫描与冷文件系统 IO。按每文件 20–40 ms 估算即 3–6 min（**估算，未在干净机器复测**；桌面监督器已实测 >5 min 未就绪，见 §3） |
| 最值得做的修复 | 安装包内**预生成并随包携带**"已迁移数据库 + 静态/类型缓存"，安装时跑一次 self-test；中期把服务端模块图 bundling 到远少于 100 个文件 |
| 明确不要做 | `NODE_COMPILE_CACHE`：实测无预热收益（7.61–8.19 s ready vs 基线 7.53–7.91 s），且首次填充让退出多花 **9.7 s**（写 9,647 个缓存文件 / 31.3 MB） |

## 2. 测量口径

- 计时从 `spawn` 子进程开始，外部轮询 `GET /healthz`（监听成立）与 `GET /healthz/readiness`（`fullyReady`，= 路由/编辑器可用），间隔 25 ms。
- 每次运行结束都通过控制端点优雅退出（`POST /internal/control/shutdown`），并记录 202→退出耗时、退出码、SQLite WAL 状态。
- 每轮开始前确认无残留 `pong` 进程；除注明外都使用同一个已预热用户目录（`pong-studio/.pong-data`）。
- "冷"在本机只能做到**缓存冷**（空用户目录、无类型/静态缓存），无法清空 Windows 文件缓存与 Defender 扫描缓存；真正的"全新机器冷启动"需 M3 在干净 VM 上按 §7 复测。

## 3. 冷/温启动对比数据

### 3.1 预热后（同一用户目录，3 次）

| 运行 | `/healthz` 200 | `/healthz/readiness` 200 | 202 响应 | 202→退出 | 退出码 | WAL（退出后） |
|---|---|---|---|---|---|---|
| #1 | 3,899 ms | 7,527 ms | 19 ms | 177 ms | 0 | 0 B |
| #2 | 3,979 ms | 7,906 ms | 20 ms | 165 ms | 0 | 0 B |
| #3 | 3,991 ms | 7,835 ms | 20 ms | 169 ms | 0 | 0 B |

### 3.2 其它场景（每次 1–3 run，数字为范围/代表值）

| 场景 | `/healthz` | `readiness` | 说明 |
|---|---|---|---|
| 空用户目录，第 1 次启动 | 3,987 ms | **10,362 ms** | 建库 + 全量 SQLite 迁移（日志 4,031→6,095 ms ≈ 2.07 s）+ 生成缓存 |
| 同一空目录，第 2 次启动 | 4,057 ms | 7,967 ms | 迁移/缓存已完成 → 回到正常水平（差 **2.39 s**） |
| 禁用 UI（`PONG_DISABLE_UI=true`） | 3,972 / 3,975 ms | **5,990 / 5,957 ms** | 比正常快 **~1.6 s**：静态资源复制与 frontend 相关初始化成本 |
| 用户目录存在、静态缓存被删 | 3,809 / 4,071 ms | 8,079 / 8,037 ms | 与预热目录差 ~0.2–0.5 s：静态缓存每次启动都会重写，冷热差异主要来自文件系统 |
| `NODE_COMPILE_CACHE`（新缓存）第 1 次 | 4,346 ms | 8,186 ms | 首次填充；**退出耗时 9,744 ms**（写 9,647 个文件 / 31.3 MB） |
| `NODE_COMPILE_CACHE` 第 2/3 次 | 3,931 / 3,709 ms | 8,061 / 7,611 ms | 与基线无显著差异 → 不采用 |
| 真实进程 + 控制面验证（机器有其它任务在跑） | 3,962 ms | 13,054 ms | ready 受 CPU 争用影响明显；健康监听时间稳定在 ~4 s |

### 3.3 与桌面监督器记录的对照

`packages/desktop-shell/README.md` 实测评测（同一台机器、预热后）：`/healthz` 200 in **4,024 ms**，与本文 3,899–3,991 ms 一致。其"冷启动（首次、无文件缓存）>5 min 未就绪"是**该文档的实测观察，本文未复现**；本文只证明其机制成立（见 §4、§5）并给出可复测的协议（§7）。

## 4. 分段计时与根因

### 4.1 预热启动时间线（`PONG_LOG_LEVEL=debug`，单次）

| 到达时间 | 事件 | 阶段耗时 |
|---|---|---|
| 0 ms | spawn | — |
| 3,529 ms | 首条应用日志 `Initializing pong process`（此前全在加载模块图） | **~3.5 s 模块加载** |
| 3,802 ms | `pong ready on 127.0.0.1`（HTTP 端口监听） | 0.27 s：LoadNodesAndCredentials/DB 连接/迁移检查/server.init/加密引导 |
| 4,054–4,159 ms | JS task runner、license、等待执行恢复等初始化 | 0.36 s |
| 4,159 → 5,666 ms | 生成编辑器静态资源缓存 + 模块初始化开始 | **1.51 s（最大单段）** |
| 5,772 → 6,474 ms | modules init（inbound-auth/insights/external-secrets/mcp/…）、实例注册 | 0.80 s |
| 6,474 → 7,558 ms | instance-ai 设置/事件中继、event bus、workflow publication 等 | 1.08 s |
| 7,558 ms | `Version: 2.48.0`（configure 完成） | — |
| 7,587 ms | `markAsReady()` → `/healthz/readiness` 200 | — |

即：**到监听 3.8 s，其中 92% 是模块加载；到完全就绪 7.6 s，模块加载占 46%，configure 占 50%。**

### 4.2 模块图规模（`NODE_OPTIONS=--require` 探针，见 §8.3）

| 指标 | 实测 |
|---|---|
| 编译的 CJS 文件数 | **8,962** |
| 编译的 JS 源码总量 | **46.2 MB** |
| 入口直接子模块包含式耗时 | `packages/cli` **3,049–3,076 ms**；`packages/@pong` **983–989 ms**；`.pnpm` 60–65 ms |
| 按文件数 | `.pnpm` 3,928；`packages/@pong` 2,628；`packages/cli` 2,067；`core` 139；`workflow` 135；`modules` 65 |
| 按字节 | `.pnpm` 22.5 MB；`packages/cli` 12.4 MB；`packages/@pong` 9.5 MB；`workflow` 1.0 MB；`core` 0.6 MB |

主导链路是 `Start` 命令的字段初始化 `Container.get(Server)` + `CommandRegistry`：它们一次拉入全部 controller/service/entity 与 `@pong/nodes-langchain` 的 CJS 图。

### 4.3 CPU profile（`node --cpu-prof`，预热启动，采样 5,452 点 / 8,366 ms）

| 项 | 自耗时 | 占比 |
|---|---|---|
| 模块加载相关函数（`wrapSafe`/`_compile`/`Module._load`/`readFileUtf8`/`internalModuleStat`/`lstat`/`realpathSync` 等） | **1,791 ms** | 21.4% |
| `wrapSafe`（编译） | 1,116 ms | 13.3% |
| `internalModuleStat`（模块解析路径 stat） | 927 ms | 11.1% |
| `readFileUtf8`（读 JS） | 646 ms | 7.7% |
| `lstat` + `realpathSync` | 216 + 153 ms | 4.4% |
| GC | 455 ms | 5.4% |
| `node:internal/modules/cjs/loader` 自身 | 1,536 ms | 18.4% |

`internalModuleStat + lstat + realpathSync` ≈ **1.3 s** 只是在解析 9,000 个模块的路径——这些正是冷机器上要重新走文件系统（并被杀软逐个扫描）的操作。

### 4.4 编辑器静态资源

`generateStaticAssets()` 每次启动都把 `pong-editor-ui/dist` 的 JS/CSS 经 `replacestream` 重写进 `PONG_USER_FOLDER/.cache/pong/public`：

| 指标 | 实测 |
|---|---|
| 源：editor-ui dist | 1,258 文件 / 65.9 MB |
| 目标：静态缓存 | 1,176 文件 / 74.2 MB（含 `types/*.json`、`index.html`） |
| 禁用 UI 的收益 | ready 7.5–7.9 s → **5.96–5.99 s（≈1.6 s）** |
| 删除静态缓存后的差异 | 仅 +0.2–0.5 s（说明成本主要是"每次重写"，不是"首次生成"；冷机器上每个写操作会被扫描，代价放大） |

### 4.5 首次启动（空用户目录）

| 项 | 实测 |
|---|---|
| 空目录第 1 次 vs 第 2 次 ready | 10,362 ms vs 7,967 ms（**+2.39 s**） |
| 其中 SQLite 迁移（日志时间戳差） | ≈ **2.07 s**（4,031 → 6,095 ms） |
| 迁移条数（本次日志逐条打印的） | 18 条（含 backfill；其余按 TypeORM 迁移表批量执行，日志未逐条打印） |

## 5. 冷启动 >5 min 的机制与证据

本机可核对的事实：

- `Get-MpComputerStatus`：`RealTimeProtectionEnabled=True`、`AntivirusEnabled=True`、`IsTamperProtected=True`；
- 排除项无法在非管理员下读取（`N/A: Must be an administrator to view exclusions`），即**不能假设**安装目录/Node/npm 缓存已被排除；
- 一次启动接触的文件量：**8,962 个 JS 文件读取+编译**、约 1,300 个静态资源读取、1,176 个缓存文件写入；
- 预热后这些操作合计约 4 s（页缓存命中、Defender 已缓存扫描结果）。

冷机器上同一批操作需要：冷页缓存 IO（机械盘/OneDrive 同步目录可达 5–30 ms/文件）+ Defender 首次扫描每个被写入/读取的文件。若每个文件平均多 20–40 ms：

```
8,962 × 20 ms ≈ 3.0 min        （仅模块文件）
8,962 × 40 ms ≈ 6.0 min
+ 1,258 读 + 1,176 写静态缓存
```

与监督器实测的 ">5 min 未就绪" 量级一致。**这是估算，不是实测**；§7 给出干净 VM 的验证协议。可以确定的是：如果首次启动慢是 DB 迁移或我们的业务初始化造成的，上面这些数字（迁移 2.07 s、UI 1.6 s）不可能解释 >5 min——**根因在模块图/静态资源的首次文件访问，而不是 pong 的业务启动逻辑**。

## 6. M3 安装包预热方案（按实测收益排序）

### P0 安装时跑一次 self-test（推荐，立即做）

安装包最后一步：用与首次启动相同的环境启动一次 pong，等 `/healthz/readiness` 200，再调用控制端点优雅退出（本文的测量脚本即是）。收益（实测）：

| 项 | 未预热首次启动 | 预热后首次用户启动 | 收益 |
|---|---|---|---|
| `/healthz/readiness` | 10,362 ms | 7,967 ms | **-2.39 s** |
| SQLite 迁移 | 2.07 s | 0（已迁移） | -2.07 s |
| 类型缓存/静态缓存 | 首次生成 | 已存在 | 已计入上一行 |

注意：self-test 必须与用户首次启动使用**同一个 `PONG_USER_FOLDER`**，并在安装器退出前保留；同时记录 `self-test` 耗时，超过阈值则让安装器给出警告（这是 M3 的安装质量闸门）。

### P1 随包携带预生成的用户目录模板（推荐）

在 CI 构建安装包时生成一个"模板用户目录"：空库 + 已跑完迁移的 `database.sqlite` + `.cache/pong/public`（静态缓存 + `types/{nodes,credentials,node-versions}.json`）+ 必要配置，作为安装器资源打入包内，安装时复制到 `%LOCALAPPDATA%`。收益与 P0 相同（-2.39 s），但**不需要在用户机器上跑迁移**，也避免迁移失败/迁移锁问题；代价是安装包增大（SQLite 2.8 MB + 静态缓存 74 MB，可由安装器压缩）。校验：启动时比较 schema 版本/迁移表与打包版本，不匹配则回退到"现场迁移"。

### P2 把服务端模块图 bundling 到少量文件（根治，建议 M2/M3）

当前 8,962 个 CJS 文件 / 46.2 MB，其中 3.0–3.1 s 花在 `packages/cli` 入口链、1.0 s 花在 `@pong` 包链。用 esbuild/rolldown 把 `dist`（含 controller/service/entity 与常用节点包）打成 1–3 个 bundle：

- 预热收益上限（实测）：模块加载自耗时约 3.0–3.8 s（profile 的 loader 相关 1,791 ms + 解析/读取），打成单文件后主要省掉 8,900+ 次 `open/stat/read`；
- 冷机收益远大于预热收益：文件数从 ~9,000 降到 <100，是唯一能去掉"首次访问放大"的方案；
- 风险：动态 `await import()`（本次改造的控制端点也用 `import` 注册）、TypeORM 实体装饰器、原生模块（sqlite3/isolated-vm）需要保持外部化；建议只 bundle 服务端 JS，原生 `.node` 保持 require。
- **必须用干净 VM A/B 验证后再定 M3 是否启用**（见 §7）。

### P3 Defender/签名（预期最大，但本机无法量化）

- 安装器以管理员权限为安装目录、`PONG_USER_FOLDER`、Node 运行目录添加 Defender 排除项；
- 或对 `node.exe`、pong bundle、supervisor exe 做 Authenticode 签名，降低 SmartScreen/扫描延迟；
- 本机无法查看/修改排除项（非管理员），也缺少干净机器，**不给出数字**；M3 安装器应把它作为可选项并在干净 VM 上 A/B。

### P4 明确不做：`NODE_COMPILE_CACHE`

实测（§3.2）：预热缓存后 ready 8.06/7.61 s vs 基线 7.53/7.91 s，无稳定收益；首次填充让退出多 9.7 s、额外写 31.3 MB / 9,647 个文件。在"文件 IO 是瓶颈"的场景引入更多文件是反向优化。

### P5 保留现有 `--self-test` 并暴露进度（体验兜底）

冷启动无法在 M3 消除前，监督器应在 `/healthz` 之前显示"正在启动（首次启动可能较慢）"，并给用户取消入口（取消走同一控制端点；注意控制路由在 `/healthz/readiness` 之前不可用，见 `docs/architecture/control-plane.md` §4/§10）。

**预计总收益**：P0+P1 让每次安装后的第一次启动回到 ~8 s（-2.4 s，实测）；P2 若把模块加载 3.0–3.8 s 降到 <1 s，预热启动可再省 2–3 s；P3 的目标是让首次启动从分钟级回到 10–15 s，需干净 VM 验证。

## 7. M3 验收测量协议（干净机器）

1. Windows VM 快照：Defender 实时防护开启、无排除项、系统盘冷启动后不预热任何仓库文件；
2. 记录 `/healthz`、`/healthz/readiness`、202→退出、退出码、WAL 大小（本文脚本可直接复用，见 §8）；
3. 第一次启动（安装后、不跑 self-test）测 1 次；卸载重装并跑 self-test 后再测 1 次；预热后连测 3 次；
4. 用 Process Monitor/ETW 记录 `CreateFile`/`ReadFile` 计数与耗时，验证"文件访问数 × 单次成本"的假设；
5. 阈值建议：预热后 `/healthz` ≤5 s、`readiness` ≤8 s、控制退出 ≤1 s 且退出码 0、WAL=0；未预热的首次启动 ≤15 s（若仍 >1 min，说明杀软/IO 因素占主导，按 P3/P2 处理）。

## 8. 复现脚本

### 8.1 启动测量（spawn → healthz/readiness → 控制端点退出）

```js
// measure.mjs：node measure.mjs --label warm --user-folder <dir> [--repeat 3]
//              [--compile-cache <dir>] [--cpu-prof-dir <dir>] [--log-level debug]
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';

const repo = 'C:/Users/NJHTR/IdeaProjects/seekwd/pong-studio';
const node = 'C:/Users/NJHTR/IdeaProjects/seekwd/.tools/node24/node.exe';
const pong = path.join(repo, 'packages/cli/bin/pong');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const label = arg('label', 'run');
const userFolder = path.resolve(arg('user-folder'));
const repeat = Number(arg('repeat', 1));
const outFile = path.join(process.env.TEMP ?? '.', 'pong-task11', 'results.jsonl');
const token = `measure-${process.pid}-${Date.now()}`;
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const freePort = () => new Promise((ok, fail) => {
  const s = net.createServer();
  s.unref();
  s.on('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});
const status = async (url) => { try { return (await fetch(url, { signal: AbortSignal.timeout(2000) })).status; } catch { return 0; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let run = 1; run <= repeat; run += 1) {
  const port = await freePort();
  const env = {
    ...process.env, PONG_PORT: String(port), PONG_LISTEN_ADDRESS: '127.0.0.1',
    PONG_USER_FOLDER: userFolder, PONG_LOG_LEVEL: arg('log-level', 'info'),
    PONG_CONTROL_TOKEN: token, PONG_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
    PONG_DIAGNOSTICS_ENABLED: 'false', PONG_TEMPLATES_ENABLED: 'false',
    PONG_PERSONALIZATION_ENABLED: 'false', PONG_HIRING_BANNER_ENABLED: 'false',
  };
  const nodeArgs = [];
  if (arg('cpu-prof-dir')) nodeArgs.push('--cpu-prof', `--cpu-prof-dir=${path.resolve(arg('cpu-prof-dir'))}`);
  const t0 = performance.now();
  const child = spawn(node, [...nodeArgs, pong, 'start'], { cwd: repo, env, stdio: ['pipe', 'pipe', 'pipe'] });
  const logs = [];
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (d) => {
    for (const line of d.toString().split(/\r?\n/)) if (line.trim()) logs.push({ at: Math.round(performance.now() - t0), line });
  });
  let exited = false; let exitCode = null;
  child.on('exit', (code) => { exited = true; exitCode = code; });
  let healthMs = null; let readyMs = null;
  while (performance.now() - t0 < 240_000 && !exited) {
    if (healthMs === null && (await status(`http://127.0.0.1:${port}/healthz`)) === 200) healthMs = Math.round(performance.now() - t0);
    if (readyMs === null && (await status(`http://127.0.0.1:${port}/healthz/readiness`)) === 200) { readyMs = Math.round(performance.now() - t0); break; }
    await sleep(25);
  }
  let shutdownStatus = null; let ackMs = null; let exitMs = null; let forcedKill = false;
  if (readyMs !== null) {
    const t1 = performance.now();
    try { shutdownStatus = (await fetch(`http://127.0.0.1:${port}/internal/control/shutdown`, { method: 'POST', headers: { 'x-pong-control-token': token }, signal: AbortSignal.timeout(3000) })).status; } catch {}
    ackMs = Math.round(performance.now() - t1);
    while (!exited && performance.now() - t1 < 20_000) await sleep(20);
    exitMs = Math.round(performance.now() - t1);
    if (!exited) { forcedKill = true; child.kill('SIGKILL'); }
  } else child.kill('SIGKILL');
  const record = { label, run, port, healthMs, readyMs, shutdownStatus, ackMs, exitMs, exitCode, forcedKill, logs };
  fs.appendFileSync(outFile, `${JSON.stringify(record)}\n`);
  console.log(`[${label} #${run}] health=${healthMs} ms ready=${readyMs} ms ack=${ackMs} ms exit=${exitMs} ms exitCode=${exitCode} forcedKill=${forcedKill}`);
}
```

运行示例：

```powershell
# 预热基线（同一用户目录 3 次）
node measure.mjs --label warm --user-folder C:\...\pong-studio\.pong-data --repeat 3
# 首次启动：空用户目录
node measure.mjs --label fresh --user-folder C:\...\temp\fresh-user --repeat 2
# 禁用 UI 对照
$env:PONG_DISABLE_UI='true'; node measure.mjs --label ui-off --user-folder C:\...\.pong-data --repeat 2
# compile cache 实验
node measure.mjs --label compile-cache --user-folder C:\...\.pong-data --compile-cache C:\...\cc --repeat 3
# CPU profile
node measure.mjs --label cpuprof --user-folder C:\...\.pong-data --cpu-prof-dir C:\...\profiles
```

### 8.2 控制面检查

```powershell
# 需要与 pong 启动环境一致；等待 /healthz/readiness 后再测控制端点
$token = 'verify-' + [guid]::NewGuid().ToString('N')
$env:PONG_CONTROL_TOKEN=$token; $env:PONG_PORT='5800'; $env:PONG_LISTEN_ADDRESS='127.0.0.1'
$env:PONG_USER_FOLDER='C:\...\pong-studio\.pong-data'
node packages/cli/bin/pong start
# 另开终端：
(Invoke-WebRequest http://127.0.0.1:5800/internal/control/health).StatusCode                       # 401
(Invoke-WebRequest -Headers @{'x-pong-control-token'=$token} http://127.0.0.1:5800/internal/control/health).Content
(Invoke-WebRequest -Method Post -Headers @{'x-pong-control-token'=$token} http://127.0.0.1:5800/internal/control/shutdown).StatusCode  # 202
```
（Windows PowerShell 5.1 用 `-UseBasicParsing` 并 try/catch 读取非 2xx；本文实测脚本 `probe-control.mjs` 见仓库外临时目录，逻辑与 §8.1 相同。）

### 8.3 CJS 模块图探针

```js
// load-probe.cjs：NODE_OPTIONS=--require <abs path>，PONG_LOAD_REPORT=<path>-{pid}.json
const Module = require('node:module');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const reportFile = (process.env.PONG_LOAD_REPORT ?? '').replace('{pid}', String(process.pid));
const stack = []; let compiled = 0; let bytes = 0; const direct = new Map();
const groupOf = (file) => {
  let m = /pong-studio[\\/]packages[\\/]([^\\/]+)[\\/]/.exec(file); if (m) return `packages/${m[1]}`;
  m = /pong-studio[\\/]node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)[\\/]/.exec(file); if (m) return `node_modules/${m[1]}`;
  return 'other';
};
const original = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  const start = performance.now(); const depth = stack.length; stack.push(filename);
  try { return original.call(this, content, filename); }
  finally {
    stack.pop(); compiled += 1; bytes += Buffer.byteLength(content);
    if (depth === 1) direct.set(groupOf(filename), (direct.get(groupOf(filename)) ?? 0) + (performance.now() - start));
  }
};
process.on('exit', () => fs.writeFileSync(reportFile, JSON.stringify({
  compiledFiles: compiled, totalCompiledMb: Math.round(bytes / 104857.6) / 10,
  directChildMs: [...direct.entries()].map(([g, ms]) => [g, Math.round(ms)]).sort((a, b) => b[1] - a[1]),
}, null, 2)));
```

### 8.4 CPU profile 汇总

`node --cpu-prof` 产物（`*.cpuprofile`）用脚本按 `samples`/`timeDeltas` 聚合自耗时到 URL 与函数（本文 §4.3 数字即该脚本输出，约 80 行：解析 JSON → 按 node id 累加 timeDelta → 按 `callFrame.url` 分组）。

## 9. 局限与风险

1. 未在"干净机器/清空文件缓存"上复测，>5 min 的冷启动数字来自桌面监督器记录，本文只证明机制（§4/§5）并给出协议（§7）；
2. Defender 排除项/扫描耗时在非管理员下不可读取，杀软贡献为估算；
3. 本机 CPU 争用会显著拉长 `readiness`（实测 7.5–13.1 s），测量前应确认无其它 pong/构建任务；`/healthz` 时间稳定在 3.7–4.0 s；
4. P2 bundling 需要处理动态 import、TypeORM 实体与原生模块，先做 PoC 评估，不能直接用于 M3 安装包；
5. 预热缓存会被 Windows/Defender 淘汰（重启、系统清理），P0/P1 只能保证"安装后第一次启动"；根因修复仍需 P2/P3。
