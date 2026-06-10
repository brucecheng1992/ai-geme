# AI 游戏 DSL 生成系统 P0 本地可落地技术实施文档

**版本**：v0.2-local-p0  
**状态**：P0 本地落地实施稿  
**日期**：2026-06-09  
**目标**：在一个本地目录内，实现“一句话游戏想法 → DSL → IR → Phaser 可试玩项目 → Playwright QA → PLAYABLE / QA_FAILED”的最小闭环。  

---

## 0. 本版核心变化

相比上一版架构稿，本版做了 6 个关键收束：

1. **一期只做本地可运行**
   - 不做线上部署
   - 不做云数据库
   - 不做多用户
   - 不做权限系统
   - 不做生产级发布

2. **所有文件必须放在一个根目录内**
   - 工程代码
   - 生成项目
   - 本地数据
   - 模型输出
   - 构建日志
   - QA 报告
   - Telemetry
   - 临时产物

3. **一期只做 `new_game`**
   - 不做用户主动 change request
   - 不做可视化 DSL 编辑器
   - 不做多轮需求修改
   - Auto Repair 只用于系统内部失败修复

4. **不做通用游戏引擎编译器**
   - P0 只做 3 个 deterministic Phaser template：
     - collector
     - dodger
     - shooter
   - DSL / IR 只填模板参数
   - 不允许任意组合复杂玩法

5. **必须有本地 Job Protocol**
   - 前端不能只拿到 DSL
   - 必须拿到项目状态、构建状态、预览地址、QA 报告、最终 PLAYABLE 结果

6. **必须有一键启动脚本**
   - 用户只需要进入根目录
   - 执行一个命令
   - 即可启动本地 API、本地 Workbench、本地预览能力

---

## 1. 一句话结论

P0 不做“LLM 直接写游戏源码”。

P0 采用：

```txt
一句游戏想法
  ↓
Game Brief
  ↓
LLM 生成 Engine-Agnostic Raw Game DSL
  ↓
本地 Schema / Semantic / Mechanic Contract 校验
  ↓
Normalized Game IR
  ↓
Phaser Template 参数化编译
  ↓
Generated Phaser Project
  ↓
Vite Build
  ↓
本地静态 Preview
  ↓
Playwright Gameplay QA
  ↓
Authoritative Telemetry Gate
  ↓
PLAYABLE / QA_FAILED / REPAIR_REQUIRED
```

核心原则：

```txt
LLM 只生成 DSL 或 DSL Patch。
系统本地代码负责校验、归一化、编译、运行、QA 和最终判定。
```

---

## 2. P0 最终目标

用户在本地执行：

```bash
cd ai-game-maker-p0
npm run maker:start
```

打开本地 Workbench：

```txt
http://localhost:5173
```

输入：

```txt
做一个小猫射击外星人的小游戏
```

系统完成：

```txt
1. 调用 DeepSeek 生成 Game Brief
2. 调用 DeepSeek 生成 Raw Game DSL
3. 本地校验 DSL
4. 本地生成 Normalized Game IR
5. 本地编译 Phaser 项目
6. 本地 Vite build
7. 本地静态预览
8. 本地 Playwright QA
9. 本地读取 telemetry
10. 返回 PLAYABLE / QA_FAILED
```

Workbench 显示：

```txt
项目标题
生成状态
DSL 校验结果
Build 结果
Preview 地址
QA 报告
Telemetry 摘要
最终状态
```

---

## 3. P0 明确范围

### 3.1 P0 做什么

```txt
本地单机运行
单根目录 monorepo
React Workbench
NestJS Backend
DeepSeek Model Provider
Game Brief
Raw Game DSL
Normalized Game IR
Collector / Dodger / Shooter 三类游戏
Phaser 3 + Arcade Physics
Primitive shape/text 资源
Vite Build
Backend 静态 Preview
Playwright Gameplay QA
Runtime Telemetry
最多 2 次 DSL Auto Repair
本地 JSON 数据存储
一键启动脚本
一键清理脚本
```

### 3.2 P0 不做什么

```txt
线上部署
云数据库
用户账号
权限系统
多用户协作
支付
素材生成
图片生成
音频生成
用户上传资源
多引擎
Godot / Cocos / Pixi Adapter
复杂平台跳跃
复杂 RPG
塔防
卡牌
开放世界
多关卡编辑器
用户主动 change request
可视化 DSL 编辑器
任意脚本能力
LLM 直接生成 Phaser 源码
```

---

## 4. 单根目录约束

所有文件必须位于：

```txt
ai-game-maker-p0/
```

P0 禁止写入该目录之外的任何路径。

### 4.1 根目录结构

```txt
ai-game-maker-p0/
  package.json
  package-lock.json
  .env
  .env.example
  .gitignore
  README.md

  apps/
    maker-api/
    maker-workbench/

  packages/
    game-dsl/
    runtime-core/
    runtime-adapters/
      phaser/

  templates/
    phaser/
      collector/
      dodger/
      shooter/

  scripts/
    setup.mjs
    dev.mjs
    check-env.mjs
    clean.mjs
    doctor.mjs

  local-data/
    projects/
    runs/
    logs/
    artifacts/
    qa-reports/
    telemetry/
    model-outputs/
    build-logs/
    repair-reports/

  generated-projects/
    <project-id>/

  tests/
    fixtures/
    e2e/
    contracts/
```

### 4.2 路径规则

所有后端写文件必须通过：

```ts
LocalWorkspaceService
```

禁止在业务代码中直接拼接任意磁盘路径。

允许写入：

```txt
local-data/*
generated-projects/*
```

禁止写入：

```txt
../
~/
Desktop/
Downloads/
/tmp
系统任意绝对路径
```

### 4.3 LocalWorkspaceService 职责

```ts
export class LocalWorkspaceService {
  getRootDir(): string;
  getLocalDataDir(): string;
  getGeneratedProjectsDir(): string;

  getProjectDir(projectId: string): string;
  getRunDir(runId: string): string;
  getQaReportPath(projectId: string, runId: string): string;
  getTelemetryPath(projectId: string, runId: string): string;
  getModelOutputPath(projectId: string, runId: string, name: string): string;
  assertInsideWorkspace(absPath: string): void;
}
```

硬规则：

```txt
任何文件写入前必须 assertInsideWorkspace。
```

---

## 5. 技术栈冻结

| 层级 | P0 决策 | 说明 |
|---|---|---|
| Monorepo | npm workspaces | 减少额外工具依赖 |
| 前端 | React + Vite + Zustand + TailwindCSS + HeroUI + React Router | 本地 Workbench |
| 后端 | NestJS 标准工程 | 本地 API / Job / Preview / QA 调度 |
| 模型 Provider | DeepSeek API | OpenAI-compatible Adapter |
| 模型调用 | OpenAI SDK + Chat Completion + JSON Output | 输出仍必须本地校验 |
| DSL Schema | Zod | TypeScript 内部校验 |
| Runtime | Phaser 3 + Arcade Physics | P0 唯一 Runtime |
| Build | Vite | 生成项目本地 build |
| QA | Playwright Chromium | 真实浏览器操作 |
| 数据 | 本地 JSON 文件 | 不引入数据库 |
| 预览 | NestJS static serve | 不为每个项目启动独立 dev server |

---

## 6. 一键启动设计

### 6.1 根目录 package.json

```json
{
  "name": "ai-game-maker-p0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "packages/runtime-adapters/*"
  ],
  "scripts": {
    "maker:setup": "node scripts/setup.mjs",
    "maker:doctor": "node scripts/doctor.mjs",
    "maker:start": "npm run maker:setup && node scripts/dev.mjs",
    "maker:clean": "node scripts/clean.mjs",
    "test": "npm run test:contracts && npm run test:e2e",
    "test:contracts": "vitest run tests/contracts",
    "test:e2e": "vitest run tests/e2e"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0"
  }
}
```

### 6.2 maker:start 做什么

```txt
1. 检查当前目录是否为 ai-game-maker-p0
2. 检查 Node 版本
3. 检查 .env 是否存在
4. 检查 DEEPSEEK_API_KEY 是否存在
5. 创建 local-data 子目录
6. 创建 generated-projects 子目录
7. 检查 Playwright Chromium 是否安装
8. 启动 NestJS API
9. 启动 React Workbench
10. 打印本地访问地址
```

### 6.3 本地端口

```txt
maker-api:       http://localhost:3000
maker-workbench: http://localhost:5173
preview:         http://localhost:3000/preview/:projectId/index.html
```

P0 不启动每个 generated project 的独立 Vite dev server。

---

## 7. 环境变量

### 7.1 .env.example

```bash
# API
PORT=3000
WORKBENCH_ORIGIN=http://localhost:5173

# DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_DSL_MODEL=deepseek-v4-flash
DEEPSEEK_REVIEW_MODEL=deepseek-v4-pro

# Local workspace
LOCAL_WORKSPACE_ROOT=.

# QA
PLAYWRIGHT_BROWSER=chromium
QA_TIMEOUT_MS=30000

# Repair
MAX_REPAIR_ATTEMPTS=2
```

### 7.2 模型名处理规则

模型名不得硬编码在业务逻辑中。

必须从环境变量读取：

```txt
DEEPSEEK_DSL_MODEL
DEEPSEEK_REVIEW_MODEL
```

如果模型不可用，系统返回：

```json
{
  "status": "MODEL_PROVIDER_FAILED",
  "code": "MODEL_NOT_AVAILABLE",
  "message": "Please check DEEPSEEK_DSL_MODEL in .env"
}
```

---

## 8. P0 架构总览

```txt
React Workbench
  ↓
NestJS API
  ↓
Project Job Service
  ↓
Game Brief Generator
  ↓
Raw DSL Generator
  ↓
DSL Validator
  ↓
IR Normalizer
  ↓
Runtime Capability Check
  ↓
Phaser Template Compiler
  ↓
Vite Build Runner
  ↓
Static Preview Server
  ↓
Playwright QA Runner
  ↓
Telemetry Gate
  ↓
Local JSON Storage
```

---

## 9. 后端模块设计

```txt
apps/maker-api/src/
  main.ts
  app.module.ts

  workspace/
    local-workspace.module.ts
    local-workspace.service.ts

  model-provider/
    model-provider.module.ts
    deepseek.client.ts
    model-provider.types.ts

  projects/
    projects.module.ts
    projects.controller.ts
    projects.service.ts
    project-job.service.ts
    project-store.service.ts
    project-state.types.ts

  game-dsl/
    game-dsl.module.ts
    brief-generator.service.ts
    raw-dsl-generator.service.ts
    dsl-repair.service.ts

  compiler/
    compiler.module.ts
    phaser-compiler.service.ts
    vite-build-runner.service.ts

  preview/
    preview.module.ts
    preview.controller.ts
    static-preview.service.ts

  qa/
    qa.module.ts
    playwright-qa-runner.service.ts
    telemetry-gate.service.ts

  common/
    result-envelope.ts
    error-codes.ts
```

---

## 10. 前端模块设计

```txt
apps/maker-workbench/src/
  main.tsx
  App.tsx

  routes/
    HomePage.tsx
    ProjectPage.tsx

  store/
    projectStore.ts

  api/
    client.ts
    projectApi.ts

  components/
    IdeaInputPanel.tsx
    ProjectStatusPanel.tsx
    PreviewFrame.tsx
    ValidationPanel.tsx
    BuildLogPanel.tsx
    QaReportPanel.tsx
    TelemetryPanel.tsx
    ArtifactPanel.tsx
```

P0 前端只需要 1 个主页面：

```txt
左侧：输入想法 + 状态日志
右侧：iframe preview + QA/Telemetry 结果
```

---

## 11. P0 Job Protocol

### 11.1 为什么必须有 Job Protocol

生成一个 playable 项目不是单次 API 调用，它包含：

```txt
模型调用
校验
编译
build
preview
QA
repair
```

所以前端不能只调用 `/api/game-dsl/generate`。

P0 应该以 project job 为主入口。

---

## 12. API Contract

### 12.1 创建项目生成任务

```txt
POST /api/projects/generate
```

Request:

```json
{
  "idea": "做一个小猫射击外星人的小游戏",
  "language": "zh"
}
```

Response:

```json
{
  "ok": true,
  "project_id": "proj_20260609_153000_abcd",
  "run_id": "run_20260609_153000_0001",
  "status": "CREATED"
}
```

### 12.2 查询项目状态

```txt
GET /api/projects/:projectId
```

Response:

```json
{
  "ok": true,
  "project": {
    "project_id": "proj_20260609_153000_abcd",
    "title": "Cat Alien Shooter",
    "status": "PLAYABLE",
    "genre": "shooter",
    "preview_url": "http://localhost:3000/preview/proj_20260609_153000_abcd/index.html",
    "latest_run_id": "run_20260609_153000_0001"
  },
  "latest_run": {
    "run_id": "run_20260609_153000_0001",
    "status": "PLAYABLE",
    "steps": [
      {
        "name": "BRIEF_GENERATED",
        "status": "DONE"
      },
      {
        "name": "DSL_VALIDATED",
        "status": "DONE"
      },
      {
        "name": "BUILD_SUCCESS",
        "status": "DONE"
      },
      {
        "name": "QA_PASSED",
        "status": "DONE"
      }
    ]
  }
}
```

### 12.3 查询运行事件

P0 可以先用普通 JSON，不强制 SSE。

```txt
GET /api/projects/:projectId/runs/:runId/events
```

Response:

```json
{
  "ok": true,
  "events": [
    {
      "timestamp": "2026-06-09T15:30:01.000Z",
      "type": "job.started",
      "message": "Project generation started."
    },
    {
      "timestamp": "2026-06-09T15:30:04.000Z",
      "type": "dsl.validated",
      "message": "Raw Game DSL passed validation."
    }
  ]
}
```

### 12.4 查询 QA 报告

```txt
GET /api/projects/:projectId/runs/:runId/qa-report
```

Response:

```json
{
  "ok": true,
  "qa_report": {
    "status": "PASSED",
    "genre": "shooter",
    "required_events": [
      "game.started",
      "player.fired",
      "projectile.spawned",
      "enemy.hit",
      "score.changed",
      "game.restarted"
    ],
    "observed_events": [
      "game.started",
      "input.received",
      "player.fired",
      "projectile.spawned",
      "enemy.hit",
      "score.changed",
      "game.restarted"
    ]
  }
}
```

### 12.5 重新运行 QA

```txt
POST /api/projects/:projectId/runs/:runId/rerun-qa
```

P0 可选。

---

## 13. Project State Machine

### 13.1 状态枚举

```ts
export type ProjectStatus =
  | 'CREATED'
  | 'BRIEF_GENERATING'
  | 'BRIEF_GENERATED'
  | 'DSL_GENERATING'
  | 'DSL_GENERATED'
  | 'DSL_VALIDATING'
  | 'DSL_VALIDATED'
  | 'DSL_VALIDATION_FAILED'
  | 'IR_NORMALIZING'
  | 'IR_NORMALIZED'
  | 'RUNTIME_CHECKING'
  | 'RUNTIME_SUPPORTED'
  | 'RUNTIME_UNSUPPORTED'
  | 'COMPILING'
  | 'COMPILED'
  | 'BUILDING'
  | 'BUILD_FAILED'
  | 'PREVIEW_READY'
  | 'QA_RUNNING'
  | 'QA_FAILED'
  | 'REPAIR_REQUIRED'
  | 'REPAIR_RUNNING'
  | 'REPAIR_FAILED'
  | 'PLAYABLE'
  | 'FAILED';
```

### 13.2 状态推进规则

```txt
CREATED
  ↓
BRIEF_GENERATING
  ↓
BRIEF_GENERATED
  ↓
DSL_GENERATING
  ↓
DSL_GENERATED
  ↓
DSL_VALIDATING
  ↓
DSL_VALIDATED
  ↓
IR_NORMALIZING
  ↓
IR_NORMALIZED
  ↓
RUNTIME_CHECKING
  ↓
RUNTIME_SUPPORTED
  ↓
COMPILING
  ↓
COMPILED
  ↓
BUILDING
  ↓
PREVIEW_READY
  ↓
QA_RUNNING
  ↓
PLAYABLE
```

失败分支：

```txt
DSL_VALIDATION_FAILED
  ↓
REPAIR_REQUIRED
  ↓
REPAIR_RUNNING
  ↓
DSL_VALIDATING
```

```txt
QA_FAILED
  ↓
REPAIR_REQUIRED
  ↓
REPAIR_RUNNING
  ↓
DSL_VALIDATING
```

最大 repair 次数：

```txt
2
```

超过后：

```txt
REPAIR_FAILED
```

---

## 14. 本地数据结构

### 14.1 local-data/projects

```txt
local-data/projects/
  proj_20260609_153000_abcd/
    project.json
    latest-run.json
```

`project.json`：

```json
{
  "project_id": "proj_20260609_153000_abcd",
  "created_at": "2026-06-09T15:30:00.000Z",
  "updated_at": "2026-06-09T15:31:00.000Z",
  "idea": "做一个小猫射击外星人的小游戏",
  "language": "zh",
  "title": "Cat Alien Shooter",
  "genre": "shooter",
  "status": "PLAYABLE",
  "latest_run_id": "run_20260609_153000_0001",
  "preview_url": "http://localhost:3000/preview/proj_20260609_153000_abcd/index.html"
}
```

### 14.2 local-data/runs

```txt
local-data/runs/
  run_20260609_153000_0001/
    run.json
    events.jsonl
    brief.json
    raw-dsl.json
    normalized-ir.json
    validation-report.json
    runtime-compatibility.json
    build-result.json
    qa-report.json
    final-result.json
```

### 14.3 local-data/model-outputs

```txt
local-data/model-outputs/
  proj_20260609_153000_abcd/
    run_20260609_153000_0001/
      brief.raw.json
      raw-dsl.raw.json
      repair-1.raw.json
      repair-2.raw.json
```

### 14.4 generated-projects

```txt
generated-projects/
  proj_20260609_153000_abcd/
    package.json
    index.html
    src/
      main.ts
      game/
        GameScene.ts
        systems/
          InputSystem.ts
          MovementSystem.ts
          SpawnSystem.ts
          CollisionSystem.ts
          ScoreSystem.ts
          ObjectiveSystem.ts
          TelemetrySystem.ts
          QaBridge.ts
    public/
      assets/
    dist/
```

---

## 15. Contract Freeze

编码前必须先落地这些文件。

```txt
packages/game-dsl/src/schemas/game-brief-v0.1.schema.ts
packages/game-dsl/src/schemas/raw-game-dsl-v0.1.schema.ts
packages/game-dsl/src/schemas/normalized-game-ir-v0.1.schema.ts

packages/game-dsl/src/contracts/collector.contract.json
packages/game-dsl/src/contracts/dodger.contract.json
packages/game-dsl/src/contracts/shooter.contract.json

packages/runtime-core/src/telemetry/telemetry-event-v0.1.schema.ts
packages/runtime-core/src/qa/playable-qa-gate-v0.1.json

packages/runtime-adapters/phaser/src/phaser-adapter-v0.1.capabilities.json

templates/phaser/collector/template-manifest.json
templates/phaser/dodger/template-manifest.json
templates/phaser/shooter/template-manifest.json
```

没有这些文件，不进入业务开发。

---

## 16. Game Brief

### 16.1 Game Brief 作用

Game Brief 是用户想法和 DSL 之间的收敛层。

作用：

```txt
1. 识别 P0 是否支持
2. 选择 genre contract
3. 提取 core loop
4. 限制模型发挥
5. 避免直接从一句话生成复杂 DSL
```

### 16.2 Schema

```ts
export const GameBriefSchema = z.object({
  brief_version: z.literal('game-brief-v0.1'),
  title: z.string().min(1).max(80),
  genre: z.enum(['collector', 'dodger', 'shooter']),
  camera: z.literal('top_down'),
  core_loop: z.array(z.string()).min(2).max(8),
  difficulty: z.enum(['easy', 'normal']),
  target_play_time_sec: z.number().int().min(30).max(120)
});
```

### 16.3 Unsupported Genre

如果用户输入不在 P0 范围，返回：

```json
{
  "ok": false,
  "status": "UNSUPPORTED_GENRE",
  "message": "P0 only supports collector, dodger and shooter."
}
```

P0 不尝试强行套成三类之一。

---

## 17. Raw Game DSL

### 17.1 DSL 原则

DSL 是：

```txt
Engine-Agnostic Gameplay DSL
```

DSL 只描述：

```txt
游戏类型
世界尺寸
玩家
实体
输入
动作
移动
碰撞
效果
分数
胜负条件
UI
```

DSL 禁止描述：

```txt
引擎
Scene
Sprite
Texture
Physics API
Canvas
WebGL
update loop
callback
function
script
eval
```

### 17.2 P0 DSL 顶层结构

```ts
export const RawGameDslSchema = z.object({
  dsl_version: z.literal('game-dsl-v0.1'),

  metadata: z.object({
    title: z.string().min(1).max(80),
    description: z.string().max(300),
    language: z.enum(['zh', 'en'])
  }),

  game: z.object({
    genre: z.enum(['collector', 'dodger', 'shooter']),
    camera: z.literal('top_down'),
    difficulty: z.enum(['easy', 'normal']),
    target_play_time_sec: z.number().int().min(30).max(120)
  }),

  world: z.object({
    width: z.number().int().min(640).max(1280),
    height: z.number().int().min(360).max(720),
    visual_theme: z.string().min(1).max(80)
  }),

  player: PlayerSchema,

  entities: z.array(EntitySchema).min(1).max(12),

  rules: z.object({
    collisions: z.array(CollisionRuleSchema).min(1).max(12)
  }),

  objectives: ObjectivesSchema,

  ui: UiSchema
});
```

### 17.3 ID 规则

```txt
只能使用小写字母、数字、下划线
必须以字母开头
长度 2 到 40
```

正则：

```txt
^[a-z][a-z0-9_]{1,39}$
```

### 17.4 P0 枚举

#### genre

```txt
collector
dodger
shooter
```

#### camera

```txt
top_down
```

#### movement.type

```txt
static
eight_direction
horizontal
vertical
chase_player
move_left
move_right
fall_down
patrol
```

#### action.type

```txt
shoot_projectile
collect
restart
```

#### entity.kind

```txt
enemy
projectile
collectible
hazard
```

#### effect.type

```txt
damage
destroy
score_add
heal
knockback
end_game
```

#### objective.win.type

```txt
enemy_cleared
target_score
survive_duration
```

#### objective.lose.type

```txt
player_health_zero
time_up
none
```

---

## 18. 禁止词和禁止字段

### 18.1 禁止词

字符串中不得出现以下词，大小写不敏感：

```txt
phaser
pixi
godot
cocos
scene
sprite
texture
physics
arcade
matter
canvas
webgl
```

### 18.2 禁止字段

任意层级不得出现以下 key：

```txt
script
custom_script
code
function
eval
callback
onUpdate
onCreate
expression
```

### 18.3 失败码

```txt
ENGINE_LEAKAGE_DETECTED
ARBITRARY_CODE_NOT_ALLOWED
```

---

## 19. Mechanic Contract

### 19.1 Shooter Contract

Shooter 必须满足：

```txt
player.can_move
player.can_fire
projectile.exists
enemy.exists
collision.projectile_hits_enemy
enemy.can_take_damage
enemy.can_be_cleared
score_or_objective_progress.exists
win.enemy_cleared 或 win.target_score
lose.player_health_zero
```

Required telemetry：

```txt
game.started
input.received
player.moved
player.fired
projectile.spawned
enemy.hit
enemy.cleared 或 score.changed
game.restarted
```

### 19.2 Collector Contract

Collector 必须满足：

```txt
player.can_move
collectible.exists
collision.player_collects_item
score.changed
win.target_score
lose.none 或 lose.time_up
```

Required telemetry：

```txt
game.started
input.received
player.moved
item.spawned
item.collected
score.changed
game.restarted
```

### 19.3 Dodger Contract

Dodger 必须满足：

```txt
player.can_move
hazard.exists
hazard.spawn
collision.player_hits_hazard
player.damaged 或 game.lost
win.survive_duration
lose.player_health_zero 或 lose.time_up
```

Required telemetry：

```txt
game.started
input.received
player.moved
hazard.spawned
collision.detected 或 player.damaged
survival_time.changed 或 game.lost
game.restarted
```

### 19.4 防套壳规则

如果 `genre = shooter`，但没有真实射击链路：

```txt
fire input
  ↓
projectile spawned
  ↓
projectile hits enemy
  ↓
enemy damaged
  ↓
enemy cleared or score changed
```

则失败：

```txt
MECHANIC_CONTRACT_FAILED
```

不能通过把 shooter 改成 collector 来修复。

---

## 20. DSL 校验链路

```txt
Raw Game DSL
  ↓
Parse Validation
  ↓
Schema Validation
  ↓
Engine-Agnostic Purity Validation
  ↓
No-Code Validation
  ↓
ID Validation
  ↓
Reference Validation
  ↓
Numeric Range Validation
  ↓
Semantic Validation
  ↓
Mechanic Contract Validation
  ↓
Objective Reachability Validation
  ↓
Runtime Requirement Derivation
  ↓
Normalized Game IR
```

### 20.1 失败码

| 阶段 | 失败码 |
|---|---|
| JSON 解析失败 | `INVALID_JSON` |
| Schema 失败 | `SCHEMA_VALIDATION_FAILED` |
| 引擎泄漏 | `ENGINE_LEAKAGE_DETECTED` |
| 任意代码 | `ARBITRARY_CODE_NOT_ALLOWED` |
| ID 不合法 | `INVALID_ID_FORMAT` |
| ID 重复 | `DUPLICATE_ID` |
| 引用不存在 | `UNRESOLVED_REFERENCE` |
| 数值非法 | `NUMERIC_RANGE_INVALID` |
| 语义不成立 | `INVALID_GAME_SEMANTICS` |
| 机制合同失败 | `MECHANIC_CONTRACT_FAILED` |
| 目标不可达 | `UNREACHABLE_OBJECTIVE` |
| Runtime 不支持 | `RUNTIME_CAPABILITY_MISMATCH` |

---

## 21. Normalized Game IR

### 21.1 IR 作用

Raw DSL 是模型产物，不能直接编译。

IR 是系统可信中间层。

只有通过校验的 DSL 才能生成 IR。

### 21.2 IR 必须包含

```ts
export const NormalizedGameIrSchema = z.object({
  ir_version: z.literal('game-ir-v0.1'),
  source_dsl_version: z.literal('game-dsl-v0.1'),

  metadata: z.object({
    title: z.string(),
    language: z.enum(['zh', 'en'])
  }),

  game: z.object({
    genre: z.enum(['collector', 'dodger', 'shooter']),
    camera: z.literal('top_down'),
    difficulty: z.enum(['easy', 'normal'])
  }),

  world: z.object({
    width: z.number().int(),
    height: z.number().int()
  }),

  runtime_requirements: RuntimeRequirementsSchema,

  template_params: TemplateParamsSchema,

  telemetry_contract: TelemetryContractSchema,

  qa_plan: QaPlanSchema
});
```

### 21.3 可以默认补齐

```txt
画布尺寸
HUD 布局
默认字体
默认背景
默认颜色
默认 shape 外观
restart button
```

### 21.4 不能默认补齐

```txt
fire
collect
damage
collision
win condition
lose condition
genre 必备机制
required telemetry
```

原因：

```txt
这些决定游戏是否真实成立，不能由系统偷偷补。
```

---

## 22. Phaser Adapter P0

### 22.1 P0 不做通用 Compiler

P0 只做 3 个确定性模板：

```txt
templates/phaser/collector
templates/phaser/dodger
templates/phaser/shooter
```

IR 进入 Phaser Adapter 后，只能选择其中一个模板。

选择规则：

```txt
ir.game.genre = collector -> collector template
ir.game.genre = dodger    -> dodger template
ir.game.genre = shooter   -> shooter template
```

### 22.2 Phaser Adapter Capability

```json
{
  "adapter": "phaser-adapter-v0.1",
  "engine": "phaser",
  "supports": {
    "dimension": ["2d"],
    "camera": ["top_down"],
    "movement": [
      "static",
      "eight_direction",
      "horizontal",
      "vertical",
      "chase_player",
      "move_left",
      "move_right",
      "fall_down",
      "patrol"
    ],
    "collision": [
      "overlap",
      "projectile_hit"
    ],
    "actions": [
      "shoot_projectile",
      "collect",
      "restart"
    ],
    "objectives": [
      "target_score",
      "enemy_cleared",
      "survive_duration",
      "player_health_zero"
    ],
    "telemetry": true
  },
  "unsupported": [
    "3d",
    "network_multiplayer",
    "platformer_physics",
    "ragdoll_physics",
    "tilemap",
    "multi_level"
  ]
}
```

### 22.3 编译输入

```ts
export type RuntimeCompileInput = {
  projectId: string;
  runId: string;
  ir: NormalizedGameIR;
  outputDir: string;
};
```

### 22.4 编译输出

```ts
export type RuntimeCompileResult = {
  ok: boolean;
  projectId: string;
  outputDir: string;
  templateId: 'collector_v1' | 'dodger_v1' | 'shooter_v1';
  files: string[];
  errors?: string[];
};
```

---

## 23. Template Kernel

### 23.1 通用系统

三个 Phaser template 都必须包含：

```txt
InputSystem
MovementSystem
SpawnSystem
CollisionSystem
ScoreSystem
ObjectiveSystem
TelemetrySystem
GameStateSystem
QaBridge
```

### 23.2 Shooter Template 参数

```ts
export type ShooterTemplateParams = {
  world: {
    width: number;
    height: number;
  };

  player: {
    label: string;
    health: number;
    speedPxPerSec: number;
    startX: number;
    startY: number;
  };

  projectile: {
    label: string;
    speedPxPerSec: number;
    damage: number;
    lifetimeMs: number;
    cooldownMs: number;
  };

  enemy: {
    label: string;
    health: number;
    speedPxPerSec: number;
    count: number;
    spawnIntervalMs: number;
    spawnArea: 'right_edge' | 'random_edges';
  };

  scoring: {
    scorePerEnemy: number;
  };

  objective: {
    winType: 'enemy_cleared' | 'target_score';
    targetCount?: number;
    targetScore?: number;
  };
};
```

### 23.3 Collector Template 参数

```ts
export type CollectorTemplateParams = {
  world: {
    width: number;
    height: number;
  };

  player: {
    label: string;
    speedPxPerSec: number;
    startX: number;
    startY: number;
  };

  collectible: {
    label: string;
    count: number;
    scorePerItem: number;
  };

  objective: {
    targetScore: number;
  };
};
```

### 23.4 Dodger Template 参数

```ts
export type DodgerTemplateParams = {
  world: {
    width: number;
    height: number;
  };

  player: {
    label: string;
    health: number;
    speedPxPerSec: number;
    startX: number;
    startY: number;
  };

  hazard: {
    label: string;
    speedPxPerSec: number;
    spawnIntervalMs: number;
    damage: number;
  };

  objective: {
    surviveDurationMs: number;
  };
};
```

---

## 24. Asset P0 策略

P0 不生成图片资源。

P0 不依赖外部 URL。

P0 不下载素材。

P0 所有实体使用：

```txt
circle
rectangle
triangle
text label
simple color
```

示例：

```txt
player: circle + label
enemy: rectangle + label
projectile: small circle
collectible: star-like polygon or circle
hazard: triangle
```

好处：

```txt
避免 asset loading failure
避免 CORS
避免版权问题
避免图片生成成本
避免影响 QA 稳定性
```

---

## 25. Telemetry Protocol

### 25.1 原则

Telemetry 必须由 runtime authoritative system 发出。

DSL 不能声明 telemetry 结果。

模型不能伪造 telemetry。

可信事件来源：

```txt
input.received       -> InputSystem
player.moved         -> MovementSystem
player.fired         -> InputSystem / ShooterSystem
projectile.spawned   -> ProjectileSystem
enemy.hit            -> CollisionSystem
enemy.cleared        -> ObjectiveSystem / EnemySystem
score.changed        -> ScoreSystem
game.won             -> ObjectiveSystem
game.lost            -> ObjectiveSystem
game.restarted       -> GameStateSystem
```

### 25.2 事件结构

```ts
export type TelemetryEvent = {
  type: string;
  timestamp_ms: number;
  frame: number;
  payload?: Record<string, unknown>;
};
```

### 25.3 window 暴露

```ts
window.__GAME_TELEMETRY__ = {
  events: [],
  state: {
    gameStatus: 'READY',
    score: 0,
    health: 3,
    frame: 0
  }
};
```

### 25.4 P0 事件名

```txt
game.ready
game.started
input.received
player.moved
player.fired
projectile.spawned
collision.detected
enemy.hit
enemy.cleared
item.spawned
item.collected
hazard.spawned
player.damaged
score.changed
survival_time.changed
objective.completed
game.won
game.lost
game.restarted
```

---

## 26. QA Deterministic Mode

### 26.1 为什么需要

如果敌人、道具、hazard 都随机，Playwright 很难稳定触发核心玩法。

所以 P0 必须有 deterministic QA mode。

### 26.2 URL 参数

```txt
/preview/:projectId/index.html?qa=1&seed=golden
```

### 26.3 QA 模式规则

在 QA 模式下：

```txt
固定玩家出生点
固定敌人出生点
固定 collectible 位置
固定 hazard 轨迹
固定随机种子
固定时间倍率
禁用不可控随机动画
```

### 26.4 QA Bridge

```ts
window.__GAME_QA__ = {
  start(): void;
  restart(): void;
  snapshot(): GameSnapshot;
  telemetry(): TelemetryEvent[];
};
```

限制：

```txt
QA Bridge 不能直接写 telemetry。
QA Bridge 不能直接标记 game.won。
QA Bridge 只能触发真实 runtime 输入和读取状态。
```

---

## 27. Playwright QA Gate

### 27.1 通用 PLAYABLE 标准

必须满足：

```txt
1. Vite build success
2. preview load success
3. no fatal console error
4. game.ready 出现
5. start game success
6. 至少一个真实输入改变游戏状态
7. genre required telemetry 出现
8. objective 或 lose/win path 可达
9. restart works
```

### 27.2 Shooter QA

必须观察到：

```txt
game.started
input.received
player.fired
projectile.spawned
enemy.hit
enemy.cleared 或 score.changed
game.restarted
```

### 27.3 Collector QA

必须观察到：

```txt
game.started
input.received
player.moved
item.spawned
item.collected
score.changed
game.restarted
```

### 27.4 Dodger QA

必须观察到：

```txt
game.started
input.received
player.moved
hazard.spawned
collision.detected 或 player.damaged
survival_time.changed 或 game.lost
game.restarted
```

### 27.5 QA 失败结果

```json
{
  "status": "QA_FAILED",
  "code": "REQUIRED_TELEMETRY_MISSING",
  "missing_events": [
    "enemy.hit"
  ],
  "observed_events": [
    "game.started",
    "player.fired",
    "projectile.spawned"
  ],
  "repairable": true
}
```

---

## 28. Build / Preview Lifecycle

### 28.1 编译

```txt
IR
  ↓
选择 template
  ↓
写入 generated-projects/<project-id>/
  ↓
写入 template params
  ↓
生成 main.ts / GameScene.ts
```

### 28.2 Build

在 generated project 目录执行：

```bash
npm install
npm run build
```

P0 优化：

```txt
可以先让 generated project 使用根目录已有依赖
但第一版允许 npm install，只要稳定即可
```

build 日志写入：

```txt
local-data/build-logs/<project-id>/<run-id>.log
```

### 28.3 Preview

build 成功后，NestJS 静态服务映射：

```txt
generated-projects/<project-id>/dist
```

到：

```txt
http://localhost:3000/preview/<project-id>/index.html
```

### 28.4 不使用多端口 dev server

P0 禁止为每个 generated project 启动独立 Vite dev server。

原因：

```txt
端口管理复杂
进程清理复杂
并发复杂
容易残留
不利于一键清理
```

---

## 29. Auto Repair P0

### 29.1 原则

P0 只做最小 DSL Repair。

```txt
Validation Failed / QA Failed
  ↓
Failure Analysis
  ↓
DSL Patch Generation
  ↓
Apply Patch
  ↓
Re-run Validation
  ↓
Recompile
  ↓
Rebuild
  ↓
Regression QA
```

### 29.2 最大次数

```txt
MAX_REPAIR_ATTEMPTS=2
```

超过后：

```txt
REPAIR_FAILED
```

### 29.3 允许修复

```txt
新增缺失 entity
修复 unresolved reference
调整数值到合法范围
补充缺失非核心 UI
修复 objective count 不可达
补充 collision rule
补充 shooter projectile
补充 collector collectible
补充 dodger hazard
```

### 29.4 禁止修复

```txt
改 genre
删除核心机制
删除 required telemetry
改 runtime adapter
直接编辑 Phaser template
绕过 QA
把 shooter 改成 collector
重写整个项目
访问 workspace 外路径
```

### 29.5 Patch Schema

```ts
export const DslPatchSchema = z.object({
  patch_version: z.literal('game-dsl-patch-v0.1'),
  target_dsl_version: z.literal('game-dsl-v0.1'),
  reason: z.string().min(1).max(500),
  changes: z.array(z.object({
    op: z.enum(['add', 'replace', 'remove']),
    path: z.string(),
    value: z.unknown().optional()
  })).min(1).max(10)
});
```

---

## 30. Model Provider

### 30.1 DeepSeek Client

```ts
type JsonChatParams = {
  model?: string;
  system: string;
  user: unknown;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};
```

### 30.2 必须支持

```txt
JSON Output
timeout
retry
raw output logging
provider error mapping
empty content handling
invalid JSON handling
```

### 30.3 generateJson 行为

```txt
1. 发起模型请求
2. 保存 raw response 到 local-data/model-outputs
3. 解析 JSON
4. 解析失败时返回 MODEL_JSON_PARSE_FAILED
5. 空内容时最多 retry 1 次
6. 仍失败则返回 MODEL_EMPTY_CONTENT
```

### 30.4 错误码

```txt
MODEL_PROVIDER_FAILED
MODEL_TIMEOUT
MODEL_EMPTY_CONTENT
MODEL_JSON_PARSE_FAILED
MODEL_RATE_LIMITED
MODEL_NOT_AVAILABLE
```

---

## 31. Prompt Context Builder

Raw DSL 生成时，不能只传 idea 和 brief。

必须传：

```txt
用户原始 idea
Game Brief
Selected Genre Contract
Allowed Enums
Forbidden Terms
Forbidden Fields
Output JSON Rule
Valid Example
Invalid Example Summary
P0 Scope
```

### 31.1 Raw DSL Prompt 输入

```json
{
  "idea": "做一个小猫射击外星人的小游戏",
  "language": "zh",
  "brief": {},
  "selected_contract": {},
  "allowed_enums": {},
  "forbidden_terms": [],
  "forbidden_fields": [],
  "valid_example": {},
  "invalid_examples_summary": []
}
```

### 31.2 防套壳要求

Prompt 中必须明确：

```txt
Do not simulate one genre by renaming another genre.
If genre is shooter, the game must include real fire, projectile or hitscan, enemy hit, enemy clear or score progress.
If required mechanics cannot be represented, return unsupported instead of inventing code.
```

---

## 32. Frontend Workbench P0

### 32.1 页面布局

```txt
Header
  - 项目名
  - 当前状态

Left Panel
  - 输入框
  - Generate 按钮
  - 运行步骤 Timeline

Right Panel
  - Preview iframe
  - QA result
  - Telemetry summary
  - Build log
```

### 32.2 用户操作

P0 只需要：

```txt
输入 idea
点击 Generate
查看状态
查看 preview
查看 QA
重新运行 QA
清理本地数据
```

不需要：

```txt
编辑 DSL
编辑 IR
修改项目
上传素材
导出平台包
```

### 32.3 轮询

前端每 1 秒轮询：

```txt
GET /api/projects/:projectId
```

直到状态进入：

```txt
PLAYABLE
QA_FAILED
REPAIR_FAILED
FAILED
UNSUPPORTED_GENRE
```

---

## 33. 安全边界

### 33.1 本地安全规则

```txt
API Key 只存在后端 .env
前端不得读取 DEEPSEEK_API_KEY
generated project 不得访问 .env
generated project 不得写文件
generated project 不得访问 workspace 外路径
后端写文件必须走 LocalWorkspaceService
```

### 33.2 iframe sandbox

Workbench iframe：

```html
<iframe
  sandbox="allow-scripts"
  src="http://localhost:3000/preview/<project-id>/index.html"
></iframe>
```

P0 不加：

```txt
allow-same-origin
allow-forms
allow-popups
```

除非后续明确需要。

### 33.3 CORS

NestJS 只允许：

```txt
http://localhost:5173
```

示例：

```ts
app.enableCors({
  origin: ['http://localhost:5173'],
  credentials: false
});
```

---

## 34. 测试矩阵

### 34.1 Contract Tests

```txt
test:game-brief-schema
test:raw-dsl-schema
test:normalized-ir-schema
test:mechanic-contract
test:telemetry-event-schema
test:qa-gate-schema
test:phaser-capabilities
```

### 34.2 Validator Tests

```txt
valid_collector
valid_dodger
valid_shooter

invalid_phaser_leakage
invalid_custom_script
invalid_unresolved_reference
invalid_duplicate_id
invalid_unreachable_objective
invalid_shooter_without_fire
invalid_shooter_without_projectile
invalid_collector_without_collectible
invalid_dodger_without_hazard
```

### 34.3 Compiler Tests

```txt
compile_collector_template
compile_dodger_template
compile_shooter_template
reject_unsupported_capability
output_files_inside_workspace
```

### 34.4 E2E Tests

必须有：

```txt
test:e2e:collector
test:e2e:dodger
test:e2e:shooter
```

每个 E2E 跑完整链路：

```txt
idea
  ↓
brief
  ↓
raw dsl
  ↓
validation
  ↓
ir
  ↓
compile
  ↓
build
  ↓
preview
  ↓
playwright qa
  ↓
telemetry gate
  ↓
PLAYABLE
```

### 34.5 Repair Tests

```txt
repair_shooter_missing_projectile
repair_unresolved_reference
repair_unreachable_objective
repair_fails_after_2_attempts
repair_cannot_change_genre
repair_cannot_edit_template
```

---

## 35. P0 验收标准

P0 完成必须满足：

```txt
1. 新电脑 clone 项目后可安装
2. 进入 ai-game-maker-p0 根目录
3. 配好 .env
4. 执行 npm run maker:start
5. 打开 http://localhost:5173
6. 输入 collector idea 可生成 PLAYABLE
7. 输入 dodger idea 可生成 PLAYABLE
8. 输入 shooter idea 可生成 PLAYABLE
9. local-data 中能看到 run 数据
10. generated-projects 中能看到生成项目
11. QA 报告能证明核心玩法发生
12. 清理命令只清理根目录内部数据
```

### 35.1 Shooter 验收

必须看到：

```txt
game.started
input.received
player.fired
projectile.spawned
enemy.hit
enemy.cleared 或 score.changed
game.restarted
```

### 35.2 Collector 验收

必须看到：

```txt
game.started
input.received
player.moved
item.spawned
item.collected
score.changed
game.restarted
```

### 35.3 Dodger 验收

必须看到：

```txt
game.started
input.received
player.moved
hazard.spawned
collision.detected 或 player.damaged
survival_time.changed 或 game.lost
game.restarted
```

---

## 36. 推荐实施顺序

### Step 0：Contract Freeze

完成：

```txt
schema
contract
capability
qa gate
telemetry schema
template manifest
```

产出：

```txt
所有 contract 文件落盘
所有 contract tests 通过
```

### Step 1：Monorepo + 一键启动

完成：

```txt
ai-game-maker-p0 根目录
npm workspaces
apps/maker-api
apps/maker-workbench
packages/*
scripts/setup.mjs
scripts/dev.mjs
scripts/clean.mjs
```

产出：

```txt
npm run maker:start 能启动前后端
```

### Step 2：Local Workspace Storage

完成：

```txt
LocalWorkspaceService
ProjectStoreService
RunStoreService
events.jsonl
```

产出：

```txt
所有数据都写入 local-data
禁止写出根目录
```

### Step 3：Model Provider

完成：

```txt
DeepSeekClient
generateJson
raw output logging
timeout
retry
error mapping
```

产出：

```txt
可以生成 Game Brief
可以生成 Raw DSL
```

### Step 4：DSL Validator + IR Normalizer

完成：

```txt
validateGameDsl
validateMechanicContract
validateObjectiveReachability
normalizeGameDsl
deriveTemplateParams
deriveTelemetryContract
deriveQaPlan
```

产出：

```txt
valid / invalid fixtures 全部通过
```

### Step 5：Phaser Templates

完成：

```txt
collector template
dodger template
shooter template
primitive rendering
telemetry
qa bridge
restart
```

产出：

```txt
三个模板手工 fixture 可 build
```

### Step 6：Compiler + Build + Preview

完成：

```txt
compileToPhaserProject
vite build runner
static preview
preview_url
build logs
```

产出：

```txt
generated project 可在 iframe 打开
```

### Step 7：Playwright QA

完成：

```txt
qa deterministic mode
genre-specific QA runner
telemetry gate
qa report
```

产出：

```txt
collector/dodger/shooter 三类 E2E 可 PLAYABLE
```

### Step 8：Auto Repair

完成：

```txt
failure analysis
dsl patch generation
apply patch
max 2 attempts
regression QA
```

产出：

```txt
常见 validation / QA 失败可自动修一次
```

### Step 9：Workbench UI 收尾

完成：

```txt
状态 Timeline
Preview iframe
QA report
Telemetry summary
Build log
Error message
```

产出：

```txt
用户能本地演示完整闭环
```

---

## 37. 最小开发里程碑

### Milestone 1：No Model Golden Path

不用模型，直接用 fixture DSL 跑通：

```txt
fixture raw dsl
  ↓
validation
  ↓
ir
  ↓
compile
  ↓
build
  ↓
preview
  ↓
qa
  ↓
PLAYABLE
```

这是最重要的第一步。

原因：

```txt
先证明 runtime / compiler / QA 能跑通，再接模型。
```

### Milestone 2：Model DSL Path

接入 DeepSeek：

```txt
idea
  ↓
brief
  ↓
raw dsl
  ↓
validation
```

目标：

```txt
模型输出能稳定进入 validator。
```

### Milestone 3：Full Local Path

完整链路：

```txt
idea
  ↓
brief
  ↓
raw dsl
  ↓
validation
  ↓
ir
  ↓
compile
  ↓
build
  ↓
preview
  ↓
qa
  ↓
PLAYABLE
```

### Milestone 4：Repair Path

测试：

```txt
missing projectile
unresolved reference
unreachable objective
```

目标：

```txt
至少常见失败可自动修复。
```

---

## 38. 风险清单与处理策略

### 38.1 风险：DSL 正确但 Phaser 行为不完整

处理：

```txt
不做通用 compiler
只做三个确定性模板
IR 只填模板参数
```

### 38.2 风险：QA flaky

处理：

```txt
QA deterministic mode
固定 seed
固定出生点
固定实体位置
固定输入脚本
```

### 38.3 风险：模型输出不稳定

处理：

```txt
JSON Output
本地 schema 校验
invalid examples
最多 2 次 repair
失败返回明确错误
```

### 38.4 风险：文件散落

处理：

```txt
单根目录
LocalWorkspaceService
assertInsideWorkspace
clean script
```

### 38.5 风险：素材缺失

处理：

```txt
P0 primitive shapes only
不下载资源
不生成图片
```

### 38.6 风险：本地启动复杂

处理：

```txt
npm run maker:start
scripts/setup.mjs
scripts/doctor.mjs
清晰 .env.example
```

---

## 39. P1 扩展方向

P0 跑稳后再考虑：

```txt
用户主动 change request
版本历史
Rollback
SQLite
资源生成
图片素材
音效
多关卡
更多玩法
Pixi Adapter
Excalibur Adapter
Godot Adapter
Cocos Adapter
导出 zip
Docker sandbox
在线部署
```

这些全部不进入 P0。

---

## 40. 最终 P0 定义

P0 的成功标准不是“AI 生成了代码”。

P0 的成功标准是：

```txt
在 ai-game-maker-p0 一个本地目录内，
用户执行 npm run maker:start，
输入一句游戏想法，
系统可以稳定生成一个 Phaser 2D 小游戏，
本地 build 成功，
iframe 可预览，
Playwright 能真实操作，
Telemetry 证明核心玩法发生，
最后给出 PLAYABLE。
```

最终架构定案：

```txt
Single Local Workspace
  ↓
React Workbench
  ↓
NestJS Local API
  ↓
DeepSeek Model Provider
  ↓
Game Brief
  ↓
Raw Game DSL
  ↓
Deterministic Validation
  ↓
Normalized Game IR
  ↓
Phaser Deterministic Template
  ↓
Generated Local Project
  ↓
Vite Build
  ↓
NestJS Static Preview
  ↓
Playwright Gameplay QA
  ↓
Authoritative Telemetry Gate
  ↓
PLAYABLE / QA_FAILED / REPAIR_FAILED
```

一句话：

```txt
先把本地“一句话 → 可试玩 → QA 证明可玩”的闭环做稳。
```
