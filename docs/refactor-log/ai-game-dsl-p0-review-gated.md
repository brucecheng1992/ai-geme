# AI Game DSL P0 Review-Gated Refactor Log

## 分阶段拆分

分阶段执行顺序以 `docs/refactor-log/ai-game-dsl-p0-step-index.md` 为准。

`No Model Golden Path`、`Model DSL Path`、`Full Local Path` 和 `Repair Path` 是规格第 37 节的里程碑验收口径，不作为独立并列实施步骤。

## 当前阶段

P0 主链路修复已完成。

执行索引：`docs/refactor-log/ai-game-dsl-p0-step-index.md`。

当前下一步：P0 实施文档范围已完成；后续扩展应新开 P1/P2 阶段。

### 0. Contract Freeze

完成时间：2026-06-09

已完成内容：

- 新增根目录 npm workspaces、TypeScript/Vitest 基础配置和本地数据清理/准备脚本占位。
- 新增 Game Brief、Raw Game DSL、Normalized IR、Telemetry event 的 Zod schema。
- 新增 collector/dodger/shooter mechanic contract、Playable QA gate、Phaser adapter capability、三个 template manifest。
- 新增 `tests/contracts/contract-freeze.test.ts` 和 `tests/contracts/fixtures.ts`，校验 schema、contract、QA gate、IR 不变量与 manifest 的一致性。

阶段结果：

- Contract Freeze 清单中的文件已落盘。
- Raw DSL 会拒绝 forbidden fields / engine terms；Normalized IR 会拒绝 genre/template/telemetry/QA contract 漂移。
- QA gate 已冻结 `all` 全部满足、每个 `any_groups` 至少一个满足的判定语义。
- 暂未进入 API、模型、编译器、真实模板源码和 Workbench 业务开发。

已通过验证：

    npm install
    # 安装成功；曾提示 dev 依赖链 5 个漏洞，未执行 npm audit fix --force，避免破坏性升级

    npm run test:contracts
    # 1 个测试文件，11 个测试全部通过

    npm run typecheck
    # tsc --noEmit 通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- 首轮 Oracle 审查发现 P0：Raw DSL 禁止字段会被 Zod 默认剥离，缺少负例覆盖。
- 已修复：Raw DSL 改为严格对象并递归拒绝 forbidden fields / engine terms。
- 已同步处理 P1：telemetry all + any_groups、IR 跨字段一致性、JSON 契约结构测试。
- 二次复审发现 P1：Normalized IR 未绑定 genre 到对应 mechanic contract telemetry。
- 已修复：Normalized IR 从实际 mechanic contract JSON 派生 genre 对应 telemetry contract，并补 QA common events、gate 判定语义、IR strict object 覆盖。
- 已补充：三类真实 contract JSON 均可构造对应 IR，Dodger 多 `any_groups` 判定语义已冻结。
- 最终 Oracle 复审：P0/P1/P2/P3 均无阻塞，Step 0 可视为完成。
- 审查模式：Oracle 复用

下一步建议：

- Step 1：Monorepo + 一键启动。补齐 `apps/maker-api`、`apps/maker-workbench` 的最小可启动骨架，并让 `npm run maker:start` 启动本地 API / Workbench。
- 进入 DSL Validator / IR Normalizer 前补 genre 到 `runtime_requirements` 的派生规则测试，避免玩法语义漂移到 compiler/template 层。

### 1.1 应用包骨架

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api` workspace 包，包含 NestJS `AppModule`、`HealthController` 和 `src/main.ts` 入口。
- 新增 `apps/maker-workbench` workspace 包，包含 React/Vite `index.html`、`App.tsx`、`main.tsx` 和 `vite.config.ts`。
- 更新根 `tsconfig.json`，让 `npm run typecheck` 覆盖 `apps/**/*.ts` 和 `apps/**/*.tsx`，并补齐 JSX、DOM、Nest decorator 编译选项。
- 通过 `npm install` 同步 workspace 依赖和 `package-lock.json`；Vite 相关包保留在 Workbench devDependencies，不进入生产依赖面。

阶段结果：

- API 仅提供 `/health` 健康检查，不包含项目状态、Job Protocol、存储、模型、编译或 QA 逻辑。
- Workbench 仅提供占位页面，不包含生成流程、状态轮询、preview iframe 或 QA 展示。
- 新增 app 文件行数均未超过 220 行；当前最大新增源码文件为 `apps/maker-api/src/health.controller.ts`，17 行。
- 本机 5173 端口已被占用，包级 Workbench 冒烟时 Vite 自动使用 5174；固定端口检查留到 Step 1.2/1.3。

已通过验证：

    npm install
    # 安装成功；全量 npm audit 仍报告 5 个 dev 依赖链漏洞，未执行 npm audit fix --force，避免破坏性升级

    npm run typecheck
    # tsc --noEmit 通过，已覆盖 apps/**/*.ts 和 apps/**/*.tsx

    npm audit --omit=dev
    # found 0 vulnerabilities

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # 返回 {"service":"maker-api","status":"ok"}；随后手动 Ctrl-C 停止长驻进程

    npm run --workspace @ai-game-maker/maker-workbench dev
    curl -sS http://127.0.0.1:5174/
    # 返回 Vite HTML；5173 被占用，Vite 自动切换到 5174；随后手动 Ctrl-C 停止长驻进程

审查门禁结论：

- Oracle 只读审查：P0/P1/P2 均无，Step 1.1 可通过代码审查门禁。
- P3：根 `tsconfig.json` 当前同时覆盖 Node API、React Workbench、packages 和 tests，且全局开启 DOM/JSX/Nest decorator 配置。当前骨架阶段不阻塞；进入真实 API / Workbench 逻辑前，建议拆 root/base config + app 级 tsconfig 或 project references，避免后端/shared packages 误用浏览器全局仍被类型系统放过。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.2 前置小步：收敛 TypeScript 配置边界，拆出 API / Workbench app 级 tsconfig，并保持根 `npm run typecheck` 覆盖全部项目。
- Step 1.2：一键启动脚本。让 `npm run maker:start` 执行 setup 后并发启动 API / Workbench，并打印清晰访问地址。
- Step 1.3：本地配置与端口检查。让 `maker:doctor` 检查目录、依赖、端口占用和必需环境变量占位，不输出密钥值。

### 1.2 前置小步：收敛 TypeScript 配置边界

完成时间：2026-06-10

已完成内容：

- 新增根 `tsconfig.base.json`，收敛所有 TypeScript 项目共享的严格编译选项，并显式限制基础 `lib` 为 `ES2022`。
- 根 `tsconfig.json` 回到只覆盖 `packages/**/*.ts` 和 `tests/**/*.ts`，并保留 Node/Vitest 类型。
- 新增 `apps/maker-api/tsconfig.json`，仅覆盖 API `src/**/*.ts`，单独开启 Nest decorator 相关编译选项。
- 新增 `apps/maker-workbench/tsconfig.json`，仅覆盖 Workbench `src/**/*.ts(x)` 和 `vite.config.ts`，单独开启 DOM/JSX/Vite 类型。
- 更新根 `npm run typecheck`，串行执行 root、maker-api、maker-workbench 三段类型检查。

阶段结果：

- P3 中提到的根 `tsconfig.json` 混合 DOM/JSX/Nest decorator 配置问题已收敛。
- 根类型检查仍覆盖 packages/tests，app 类型检查由各自 workspace tsconfig 承担。
- 未改动 API / Workbench 运行逻辑，未进入一键启动脚本实现。

已通过验证：

    npm run typecheck
    # 依次通过 typecheck:root、@ai-game-maker/maker-api typecheck、@ai-game-maker/maker-workbench typecheck

审查门禁结论：

- Oracle 只读审查首轮发现 P1：`tsconfig.base.json` 未显式设置 `lib`，root/API 仍可能继承 TypeScript 默认 DOM 全局。
- 已修复：`tsconfig.base.json` 显式设置 `lib: ["ES2022"]`，Workbench app tsconfig 单独覆盖 DOM/DOM.Iterable。
- Oracle 复审：P0/P1/P2 均无，本前置小步可通过审查门禁。
- P3：Workbench `tsconfig.json` 当前同时覆盖浏览器源码和 `vite.config.ts`，因此浏览器源码也能看到 Node 类型。当前骨架阶段不阻塞；后续 Workbench 逻辑增多时，可拆 `tsconfig.node.json` 给 `vite.config.ts`。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.2：一键启动脚本。让 `npm run maker:start` 执行 setup 后并发启动 API / Workbench，并打印清晰访问地址。

### 1.2 一键启动脚本

完成时间：2026-06-10

已完成内容：

- 将 `scripts/dev.mjs` 从占位输出改为本地 dev 服务启动器。
- 使用 Node 内置 `child_process.spawn` 并发启动 `@ai-game-maker/maker-api` 和 `@ai-game-maker/maker-workbench`，未新增 `concurrently` 依赖。
- 为子进程输出加 `[maker-api]` / `[maker-workbench]` 前缀，启动时打印配置访问地址。
- 当任一子进程异常退出时，停止其它子进程并收敛退出码；收到 `SIGINT` / `SIGTERM` 时停止全部子进程。
- 修复 Oracle 首轮发现的退出码问题：非 shutdown 状态下任一子进程退出，即使 code 为 0，父脚本也会设置非零退出码。

阶段结果：

- `npm run maker:start` 会先执行 `maker:setup`，再启动 API 和 Workbench。
- API 可通过 `http://localhost:3000/health` 访问。
- 本机 5173 端口已被占用，Workbench 验证时由 Vite 自动切换到 `http://127.0.0.1:5174/`；固定端口占用检查留到 Step 1.3。
- 手动 Ctrl-C 后父脚本退出码为 0，API 子 npm 进程会打印 code 130 生命周期提示；停止后 3000 和 5174 均不可连接。
- 未引入 Job Protocol、存储、模型、编译、QA 或 Workbench 状态流。

已通过验证：

    npm run maker:start
    # setup 完成；API 和 Workbench 子进程均启动；输出包含服务前缀和访问地址

    curl -sS http://localhost:3000/health
    # 返回 {"service":"maker-api","status":"ok"}

    curl -sS http://127.0.0.1:5174/ | head -20
    # 返回 Vite HTML；5173 被占用，Vite 自动切换到 5174

    # Ctrl-C 停止 npm run maker:start 后：
    curl -sS --max-time 2 http://localhost:3000/health || true
    curl -sS --max-time 2 http://127.0.0.1:5174/ | head -5 || true
    # 两个端口均连接失败，确认本次启动的子进程已停止

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    node --check scripts/dev.mjs
    # 脚本语法检查通过

审查门禁结论：

- Oracle 只读审查首轮发现 P1：非 shutdown 子进程 code 0 退出会被父进程当作成功。
- 已修复：非 shutdown 的子进程退出统一视为 dev 启动器失败，`code === 0` 或 `code === null` 时父进程退出码设置为 1。
- Oracle 复审：P0/P1/P2 均无，Step 1.2 可通过审查门禁。
- P3：`stopAll()` 当前只 kill 直接的 npm 子进程；本地验证已确认 Ctrl-C 后 3000/5174 均停止，但后续如跨平台出现孙进程残留，可考虑进程组管理或直接启动底层命令。
- P3：启动器先打印配置地址 5173，但当前机器 Vite 实际切到 5174；该问题留给 Step 1.3 端口检查处理。
- 审查模式：Oracle 复用

下一步建议：

- Step 1.3：本地配置与端口检查。让 `maker:doctor` 检查目录、依赖、端口占用和必需环境变量占位，不输出密钥值。

### 1.3 本地配置与端口检查

完成时间：2026-06-10

已完成内容：

- 将 `scripts/doctor.mjs` 从占位输出改为本地环境检查脚本。
- 检查 Node.js 主版本、`node_modules`、`package-lock.json`、`local-data/*`、`generated-projects`。
- 检查 `.env.example` 是否包含必需 key；`.env` 不存在或 key 缺失时只输出 key 名称和 warning，不输出任何环境变量值。
- 检查 `DEEPSEEK_API_KEY` 是否存在非占位值，只输出配置状态，不输出密钥内容。
- 检查 maker-api 3000 和 maker-workbench 5173 端口是否可用。

阶段结果：

- `maker:doctor` 能提前发现 5173 被占用，避免 `maker:start` 后才由 Vite 自动切换端口。
- 当前本机 `.env` 缺失，按 warning 处理；模型调用仍未进入本阶段。
- 当前本机 5173 被占用，按 failure 处理，`maker:doctor` 退出码为 1。
- 未改动 `maker:start`、API/Workbench 业务逻辑、Job Protocol、存储、模型、编译或 QA。

已通过验证：

    node --check scripts/doctor.mjs
    node --check scripts/dev.mjs
    # 脚本语法检查通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run maker:doctor
    # PASS：Node.js、依赖、local-data 目录、generated-projects、.env.example、3000 端口
    # WARN：.env is missing; model calls will remain disabled until configured
    # FAIL：maker-workbench port 5173 is already in use
    # 退出码：1

审查门禁结论：

- Oracle 只读审查：代码侧 P0/P1/P2 均无，`doctor` 可通过 Step 1.3 代码审查门禁。
- Oracle 文档复审首轮发现 P1/P2：Step Index 的 Step 2 目标与禁止范围冲突；状态指针提前推进到 Step 2。
- 已修复：状态指针退回 Step 1.3 文档审查修复；Step 2 禁止范围改为允许 Local Workspace Storage 范围内的路径边界、project/run store 和 events.jsonl，同时禁止后续阶段存储。
- P3：`parseEnv` 仅做简单 `KEY=value` 解析，不处理引号或行尾注释。当前只用于 key 状态和占位值粗检查，不阻塞；模型接入前可增强。
- 审查模式：Oracle 复用

下一步建议：

- Step 2：Local Workspace Storage + Job/API Contract。实现路径边界、project/run store、events.jsonl 和项目状态 API 契约。

### 2.1 LocalWorkspaceService 路径边界

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/workspace/local-workspace.constants.ts`，集中定义 `local-data`、`generated-projects` 和本地数据子目录名称。
- 新增 `apps/maker-api/src/workspace/local-workspace.service.ts`，实现 workspace root、local-data、generated-projects、project/run/QA/telemetry/model-output 路径解析。
- 新增 `WorkspacePathError`，对非绝对路径、越界路径、不安全 project/run id 和不安全文件名早失败。
- 新增 `apps/maker-api/src/workspace/local-workspace.module.ts`，将 workspace service 作为 API 模块内可导出的 provider。
- 更新 `apps/maker-api/src/app.module.ts`，导入 `LocalWorkspaceModule`。
- 新增 `tests/workspace/local-workspace.service.test.ts`，覆盖正常路径、非法 id、越界绝对路径和相对路径拒绝。
- 更新根 `package.json`，新增 `test:workspace`，并让 `npm test` 同时运行 contract tests 和 workspace tests。

阶段结果：

- 后端本地路径边界已集中到 `LocalWorkspaceService`。
- 本步未实现 project/run JSON store、events.jsonl 写入、项目状态 API、模型输出存储、生成项目编译产物存储或 QA 报告写入。
- 当前新增源码文件均低于 220 行；最大新增源码为 `local-workspace.service.ts`，108 行。

已通过验证：

    npx vitest run tests/workspace/local-workspace.service.test.ts
    # 1 个测试文件，5 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 5 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查：P0/P1/P2/P3 均无，Step 2.1 可通过代码审查门禁。
- 审查确认：`assertInsideWorkspace` 通过 `resolve` + `relative` 拒绝 root 外路径；project/run id 校验与当前示例匹配；model output 文件名允许 `brief.raw.json` 并拒绝路径分隔和 `..`；未越过 Step 2.1 实现 store/API/业务链路。
- 后续注意：Step 2.2 开始真实写入时，继续保持所有写路径只从 `LocalWorkspaceService` 派生；如果未来允许用户控制目录或处理已有磁盘内容，再补充 symlink/realpath 层面的写入防护。
- 审查模式：Oracle 复用

下一步建议：

- Step 2.2：Project / Run Store。基于 `LocalWorkspaceService` 实现 project.json、latest-run.json、run.json 和 events.jsonl 的最小读写，不接模型、编译或 QA。

### 2.2 Project / Run Store

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/projects/project-state.types.ts`，冻结 P0 project/run/event 基础类型和 `ProjectStatus` 状态枚举。
- 新增 `apps/maker-api/src/projects/json-file-store.ts`，集中 JSON 文件读写，并在读写前执行 workspace 边界断言。
- 新增 `apps/maker-api/src/projects/project-record.guards.ts`，对从磁盘读出的 `project.json` / `run.json` 做最小结构校验。
- 新增 `ProjectStoreService`，支持创建/读取/写入 `project.json`，以及读取/写入 `latest-run.json`。
- 新增 `RunStoreService`，支持创建/读取/写入 `run.json`，以及追加/读取 `events.jsonl`。
- 新增 `ProjectsModule` 并导入 `AppModule`，让 store service 进入 API 模块边界。
- 新增 `tests/workspace/project-run-store.test.ts`，覆盖 project/run 文件写读、events.jsonl、非法 id 拒绝和 latest-run project mismatch。
- 修复 Oracle 首轮发现的读入边界问题：`events.jsonl` 每行会校验 `timestamp/type/message`；`readProject/readRun/readLatestRun` 会校验路径 id 与文件内容 id 一致；run steps 会校验 `name/status`。
- 修复 Oracle 首轮发现的 DI 边界问题：`ProjectsModule` 使用 provider factory 注入同一个 `LocalWorkspaceService` 实例，不在 store 内部自行创建 workspace service。

阶段结果：

- `local-data/projects/<projectId>/project.json` 和 `latest-run.json` 最小读写已落地。
- `local-data/runs/<runId>/run.json` 和 `events.jsonl` 最小读写已落地。
- 所有写路径从 `LocalWorkspaceService` 派生，并在写入前执行 `assertInsideWorkspace`。
- 未实现项目 API controller、Job Protocol 编排、模型输出存储、生成项目编译产物存储、QA 报告写入、模型调用、编译或 QA。
- 当前新增源码文件均低于 220 行；最大新增源码为 `project-state.types.ts`，87 行；最大新增测试为 `project-run-store.test.ts`，171 行。

已通过验证：

    npm run test:workspace
    # local-workspace 5 个测试通过；project-run-store 6 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 11 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 LocalWorkspaceModule、ProjectsModule、AppModule；health 返回 {"service":"maker-api","status":"ok"}

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle 首轮修复后复验：
    npm run typecheck
    npm test
    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # 均通过；Nest 成功初始化 ProjectsModule，health 返回 {"service":"maker-api","status":"ok"}

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：events.jsonl 未校验事件结构；读取 project/run/latest-run 时未校验文件内容 id 与路径 id 一致；run steps 只校验数组；store provider 未真正注入 `LocalWorkspaceService`。
- 已修复：补充 `assertJobEventRecord`、run step 校验、读取 id 一致性校验和 provider factory 注入。
- Oracle 复审：P0/P1/P2 均无，Step 2.2 可通过代码审查门禁。
- P3：阶段日志验证计数曾保留旧值，已同步为 project-run-store 6 个测试、workspace tests 11 个测试。
- 审查模式：Oracle 复用

下一步建议：

- Step 2.3：项目状态 API 契约。基于 Project / Run Store 增加最小 `POST /api/projects/generate`、`GET /api/projects/:projectId`、`GET /api/projects/:projectId/runs/:runId/events`，只创建 CREATED 本地记录和读取状态，不接模型、编译或 QA。

### 2.3 项目状态 API 契约

完成时间：2026-06-10

已完成内容：

- 新增 `project-api.types.ts`，定义 generate/status/events 三个最小 API response 类型。
- 新增 `ProjectRequestError`，用于 API service 边界的请求校验错误。
- 新增 `ProjectsService`，实现 `generateProject`、`getProject`、`getRunEvents`。
- 新增 `ProjectsController`，暴露 `POST /api/projects/generate`、`GET /api/projects/:projectId`、`GET /api/projects/:projectId/runs/:runId/events`。
- 更新 `ProjectsModule`，注册 `ProjectsController` 和 `ProjectsService`。
- 新增 `tests/workspace/projects-service.test.ts`，覆盖 CREATED 记录创建、状态读取、事件读取、非法请求拒绝和 run/project mismatch。
- 修复真实 HTTP 冒烟发现的 controller 注入问题：`ProjectsController` 使用显式 `@Inject(ProjectsService)`，避免当前 `tsx` 启动链路下依赖 decorator metadata 推断。
- 修复 Oracle 首轮发现的 API 契约问题：默认 `run_id` 与 `project_id` 使用同一随机后缀，避免同秒跨项目 run 冲突；`ProjectRequestError` 继承 Nest `BadRequestException`，非法 body 真实 HTTP 返回 400；`getProject` 校验 `project.latest_run_id === latest_run.run_id`。

阶段结果：

- `POST /api/projects/generate` 会创建 `CREATED` 状态的 project/run 本地记录，写入 `latest-run.json`，并追加一条 `job.started` 事件。
- `GET /api/projects/:projectId` 会返回 project 和 latest_run。
- `GET /api/projects/:projectId/runs/:runId/events` 会返回 events.jsonl 事件。
- 本步未接模型、DSL 生成、编译、QA、repair、Workbench 状态流或后台 Job 编排。
- HTTP 冒烟产生的测试 project/run 记录已清理。
- 当前新增源码文件均低于 220 行；最大新增源码为 `projects.service.ts`，106 行；最大新增测试为 `project-run-store.test.ts`，171 行。

已通过验证：

    npm run test:workspace
    # local-workspace 5 个测试通过；project-run-store 6 个测试通过；projects-service 5 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 16 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    # Nest 成功映射 /api/projects/generate、/api/projects/:projectId、/api/projects/:projectId/runs/:runId/events

    node fetch HTTP smoke
    # invalid POST /api/projects/generate 返回 400 与 {"ok":false,"message":"idea is required."}
    # valid POST /api/projects/generate 返回 ok true、CREATED、project_id、run_id；project_id/run_id 使用同一随机后缀
    # GET /api/projects/:projectId 返回 ok true、project.status CREATED、latest_run.run_id
    # GET /api/projects/:projectId/runs/:runId/events 返回 ok true 和 job.started 事件
    # 本轮 HTTP smoke 创建的 local-data/projects/proj_20260609_171238_484b 与 local-data/runs/run_20260609_171238_484b 已清理

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：同秒不同 project 会共享固定 `_0001` run_id；非法 body 会返回 500 而不是 400；project.latest_run_id 与 latest_run.run_id 未做一致性校验。
- 已修复：run_id 使用随机后缀；`ProjectRequestError` 映射为 400；`getProject` 增加 latest_run 一致性校验，并补测试与 HTTP smoke。
- Oracle 复审：P0/P1/P2/P3 均无，Step 2.3 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 3：Model Provider。接入 DeepSeek JSON provider、raw output logging、timeout/retry/error mapping；仍必须让模型输出经本地 schema 校验后才能进入后续链路。

### 3.1 Model Provider 基础客户端

完成时间：2026-06-10

已完成内容：

- 新增 `model-provider.types.ts`，定义 `JsonChatParams`、模型错误码和 `GenerateJsonResult`。
- 新增 `model-provider.config.ts`，从环境变量读取 DeepSeek base URL、模型名、API key 和默认 timeout。
- 新增 `DeepSeekClient`，实现 JSON chat request、JSON output、raw response logging、空内容 retry 1 次、timeout、rate limit、provider failure、invalid JSON、missing key 错误映射。
- 新增 `ModelProviderModule` 并导入 `AppModule`，让 DeepSeek client 进入 API 模块边界。
- 新增 `tests/workspace/deepseek-client.test.ts`，覆盖 raw output 落盘、JSON parse、empty content retry、invalid JSON、rate limit、timeout、missing key。
- 修正 Step Index 中 Step 3 的禁止范围，允许 `local-data/model-outputs` raw output 写入，仍禁止 DSL Validator、IR Normalizer、编译、QA、repair 和 Workbench 状态流。
- 修复 Oracle 首轮发现的 provider 边界问题：非 JSON 429/5xx 先按 HTTP status 映射；HTTP 2xx response body 会先写入 raw output，再解析 provider envelope；missing key 会先 trim；timeout 改用 `DEEPSEEK_TIMEOUT_MS`；Step Index 边界标题层级已修正。

阶段结果：

- Model Provider 只提供可注入的 DeepSeek JSON client，尚未接入 `POST /api/projects/generate` 或任何项目流水线。
- 模型 raw response 会写入 `local-data/model-outputs/<projectId>/<runId>/<outputName>`。
- 模型返回 JSON 只解析为 `unknown`，尚未进入 Game Brief / Raw DSL schema 校验。
- 未调用真实 DeepSeek；测试使用注入的 fake fetch。
- 当前新增源码文件均低于 220 行；最大新增源码为 `deepseek.client.ts`。

已通过验证：

    npx vitest run tests/workspace/deepseek-client.test.ts
    # 1 个测试文件，3 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 19 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle 首轮修复后复验：
    npx vitest run tests/workspace/deepseek-client.test.ts
    # 1 个测试文件，6 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 22 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run --workspace @ai-game-maker/maker-api start
    curl -sS http://localhost:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2/P3：`response.json()` 在 status 映射前执行，非 JSON 429/5xx 错误码不稳；HTTP 200 非 JSON 时 raw output 不保证落盘；timeout 错用 `QA_TIMEOUT_MS`；missing key 未 trim；测试缺少非 JSON 429/5xx 和 raw 落盘失败场景；Step Index 边界标题层级不清。
- 已修复：改为先读 `response.text()`；非 2xx 先按 status 映射；2xx raw body 先写入 raw output，再解析 provider envelope 和 content；新增 `DEEPSEEK_TIMEOUT_MS`；missing key 使用 trim；补充测试并拆分错误映射用例。
- Oracle 复审：P0/P1/P2 均无，Step 3.1 可通过代码审查门禁。
- P3：请求头曾使用未 trim 的 API key，已改为复用 trim 后的 key；文档行数旧值已改为“低于 220 行”。
- 审查模式：Oracle 复用

下一步建议：

- Step 3.2：Prompt Context Builder + Game Brief / Raw DSL provider service。构造 brief/raw DSL prompt 输入，并让模型结果先落 raw output，再经 GameBriefSchema / RawGameDslSchema 校验；不接编译、QA 或 Workbench 状态流。

### 3.2 Prompt Context Builder + Game Brief / Raw DSL provider service

完成时间：2026-06-10

已完成内容：

- 新增 `prompt-context.types.ts`，定义 Raw DSL prompt context 的稳定输入结构。
- 新增 `prompt-context.builder.ts`，按 `GameBrief.genre` 选择 collector / dodger / shooter contract，并输出 `idea`、`language`、`brief`、`selected_contract`、`allowed_enums`、`forbidden_terms`、`forbidden_fields`、`output_json_rule`、`valid_example`、`invalid_examples_summary`、`p0_scope` 和防套壳规则。
- 新增 `GameDslProviderService`，提供 `generateGameBrief` 与 `generateRawGameDsl`；`DeepSeekClient.generateJson` 返回 `unknown` 后，必须先通过 `GameBriefSchema` / `RawGameDslSchema`，才返回结构化 `value`。
- 为 Raw DSL 增加 provider boundary 一致性门禁：`game.genre`、`game.camera`、`game.difficulty`、`game.target_play_time_sec` 必须与 Game Brief 一致，防止合法但错 genre 的 DSL 穿过 selected contract 边界。
- 在 `ModelProviderModule` 中通过 factory provider 显式注入 `DeepSeekClient` 并导出 `GameDslProviderService`。
- 新增 `tests/workspace/game-dsl-provider.test.ts`，覆盖 prompt context、shooter contract 选择、Game Brief schema 成功/失败、provider failure 透传、Raw DSL schema 成功/失败、Raw DSL 与 brief 不一致失败。

阶段结果：

- Step 3.2 只在 Model Provider 边界生成并校验 Game Brief / Raw DSL，不接入 `POST /api/projects/generate`、DSL Validator、IR Normalizer、编译、QA、repair 或 Workbench 状态流。
- `MODEL_SCHEMA_VALIDATION_FAILED` 是 `GameDslProviderResult` 的局部错误语义，用于区分模型 JSON 语法失败与 provider service schema / brief 一致性失败；后续接入流水线/API 映射时需要显式处理。
- 当前新增源码与测试文件均低于 220 行；最大新增测试文件为 `game-dsl-provider.test.ts`，最大新增源码文件为 `game-dsl-provider.service.ts`。

已通过验证：

    npx vitest run tests/workspace/game-dsl-provider.test.ts
    # 1 个测试文件，8 个测试通过

    npm test
    # contract tests 11 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm run maker:setup && npm run start --workspace @ai-game-maker/maker-api
    curl -sS http://127.0.0.1:3000/health
    # Nest 成功初始化 ModelProviderModule；health 返回 {"service":"maker-api","status":"ok"}
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`GameDslProviderService` 使用结构类型注入，Nest DI token 不够稳定；Raw DSL 只过 schema，未校验返回 DSL 与 brief genre / camera / difficulty 的一致性；测试缺少 provider failure 透传和 shooter mismatch 覆盖。
- 已修复：`ModelProviderModule` 改用 factory provider 显式注入 `DeepSeekClient`；Raw DSL schema 通过后继续校验 genre、camera、difficulty、target play time 与 Game Brief 一致；补充 provider failure 透传、shooter contract 选择和 shooter brief + collector DSL 被拒测试。
- Oracle 复审：P0/P1/P2/P3 均无，Step 3.2 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 4：DSL Validator + IR Normalizer。将 Raw Game DSL 的 schema 校验、genre contract 机制校验、runtime capability 边界和 Normalized Game IR 派生收敛到本地 validator / normalizer；仍不接编译、QA、repair 或 Workbench 状态流。

### 4. DSL Validator + IR Normalizer

完成时间：2026-06-10

已完成内容：

- 新增 `validation.types.ts`，定义 DSL 校验 issue code、issue/result 类型、`ValidateAndNormalizeResult` 和 `DslValidationError`。
- 新增 `dsl-validator.ts`，实现 Raw DSL 本地校验入口：schema 校验、engine leakage / arbitrary code 映射、ID 格式、数值范围、重复 ID、引用完整性、机制合同和目标可达性。
- 新增 `mechanic-contract.validator.ts`，按 collector / dodger / shooter 分开校验核心机制；shooter 要求真实 `shoot_projectile -> projectile -> projectile_hit -> enemy damage/clear or score progress` 链路。
- 新增 `normalizer.ts`，实现 `validateAndNormalizeRawGameDsl` 和 `normalizeRawGameDsl`；只有通过 validator 后才派生 Normalized IR，并再经过 `NormalizedGameIrSchema` 复验。
- 扩展 `NormalizedGameIrSchema.runtime_requirements.objectives`，并同步 Phaser capability 支持 `none` / `time_up`，使 runtime capability check 覆盖 movement、collision、actions、objectives。
- 更新 `packages/game-dsl/src/index.ts` 导出 validator、normalizer、校验类型和 `DslValidationError`。
- 扩展 contract fixtures 和 `dsl-validator-normalizer.test.ts`，覆盖 collector / shooter 正常 IR 派生、engine leakage、任意代码字段、重复 ID、引用缺失、不可达目标、score_add=0、shooter target_score 无 score_add、反向 projectile_hit、ID/数值失败码、normalize 不能绕过验证。

阶段结果：

- Raw Game DSL 不能直接进入编译链路；Step 4 只产出可信 `game-ir-v0.1`，不调用模型、不写 `local-data`、不生成 Phaser 项目、不运行 Vite build / Playwright QA、不接 repair 或 Workbench。
- `normalizeRawGameDsl(input: unknown)` 现在内部调用完整校验，失败抛 `DslValidationError`，不提供绕过 validator 的导出路径。
- 当前 shooter `enemy.can_be_cleared` 只认 `destroy` effect，属于 P0 保守约束；后续若模板支持按血量扣减清敌，再扩展为 `damage.value >= enemy.health`。
- 当前相关源码与测试文件均低于 220 行；机制合同已拆到独立文件，避免 `dsl-validator.ts` 职责过载。

已通过验证：

    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts tests/contracts/contract-freeze.test.ts
    # 2 个测试文件，21 个测试通过

    npm test
    # contract tests 21 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    # Oracle P3 修复后复验：
    npx vitest run tests/contracts/dsl-validator-normalizer.test.ts
    # 1 个测试文件，10 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`normalizeRawGameDsl` 可绕过 validator；collector target_score 未按 score_add.value 计算可达性；shooter target_score 无 score_add 可被误放行；projectile_hit 方向被对称匹配；runtime capability 未覆盖 objectives；ID/数值失败码未分层；`validation.types.ts` type-only import 仍经 index。
- 已修复：`normalizeRawGameDsl` 改为 `unknown` 输入并内部调用完整校验；score progress 要求正数 score_add 并按 count * scoreValue 判断；projectile_hit 改为有方向；IR 增加 `runtime_requirements.objectives` 并同步 Phaser capability；补充 ID/数值失败码映射和边界测试；移除 schema import 环；拆分机制合同文件。
- Oracle 复审：P0/P1/P2 均无，Step 4 可通过代码审查门禁。
- P3：`DslValidationError` 未设置 `name` 已修复；`enemy.can_be_cleared` 只认 `destroy` 是当前 P0 保守约束，记录为后续可扩展点。
- 审查模式：Oracle 复用

下一步建议：

- Step 5：Phaser Templates。实现 collector / dodger / shooter 三个确定性模板的最小 runtime kernel、template manifest 对齐、telemetry emit 和 QA bridge；仍不接 Compiler + Build + Preview、Playwright QA 或 repair。

### 5. Phaser Templates

完成时间：2026-06-10

已完成内容：

- 新增 `templates/phaser/shared/kernel.ts`，提供 RuntimeState、TelemetrySystem、GameStateSystem、InputSystem、MovementSystem、SpawnSystem、CollisionSystem、ScoreSystem、ObjectiveSystem、QaBridge 和 runtime 暴露边界。
- 新增 collector / dodger / shooter 的 `src/template-params.ts`、`src/GameScene.ts`、`src/main.ts` 源码骨架。
- 三个 template manifest 增加 `source_files`、`shared_files`、`required_telemetry_all`、`required_telemetry_any_groups`，并与 genre contract 对齐。
- collector 模板提供 `collectItem` 链路；dodger 模板提供 `dodgeFrame` / `hitHazard` 链路；shooter 模板提供 `fire` / `hitEnemy` 链路并用 `projectileInFlight` 防止未 fire 先 hit。
- `__GAME_TELEMETRY__` 只暴露 telemetry / state snapshot；`QaBridge.telemetry()` 和 `__GAME_TELEMETRY__.events` 都返回逐条复制的 telemetry，不暴露内部可变 event 引用。
- 新增 `tests/contracts/phaser-templates.test.ts`，覆盖 manifest 源文件、telemetry contract、shared QA bridge、genre 关键 gameplay telemetry、telemetry snapshot 只读性、restart deterministic state 和 shooter fire-before-hit 行为。

阶段结果：

- Step 5 只补模板源码骨架和模板合同测试，不接 Compiler + Build + Preview、不运行 Vite build / Playwright QA、不写 `local-data`、不接 repair 或 Workbench。
- SpawnSystem 不发非 schema 事件 `enemy.spawned`；enemy spawn 是模板内部状态，不作为 P0 telemetry contract。
- QA Bridge 只能 start / restart / snapshot / telemetry，不能直接写 telemetry 或直接标记 win。
- 当前相关模板源码、manifest 和测试文件均低于 220 行。

已通过验证：

    npx vitest run tests/contracts/phaser-templates.test.ts
    # 1 个测试文件，7 个测试通过

    npm test
    # contract tests 28 个通过；workspace tests 30 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm audit --omit=dev
    # found 0 vulnerabilities

审查门禁结论：

- Oracle 只读审查首轮发现 P1/P2：`__GAME_TELEMETRY__` 暴露可变 state/events；restart 未恢复 health / genre-specific state；shooter `hitEnemy` 可在未 `fire` 时产生 `enemy.hit`；测试只有源码字符串断言。
- 已修复：runtime 暴露改为 snapshot getter；restart 恢复 `health/maxHealth`、score、frame；shooter restart 清零 `enemiesCleared` / `projectileInFlight`，`hitEnemy` 必须先消费 `projectileInFlight`；新增轻量实例化行为测试。
- Oracle 复审再次发现 P1：telemetry 数组虽然是 copy，但 event object 仍是内部引用。
- 已修复：`QaBridge.telemetry()` 和 `__GAME_TELEMETRY__.events` getter 都返回 `cloneTelemetry()`，event 与 payload 都复制；测试覆盖修改返回 event 不污染真实 telemetry。
- Oracle 最终复审：P0/P1/P2/P3 均无，Step 5 可通过代码审查门禁。
- 审查模式：Oracle 复用

下一步建议：

- Step 6：Compiler + Build + Preview。实现 IR 选择模板、写入 generated project、生成 params / main / scene 文件、执行或准备 Vite build、记录 build logs，并通过 Nest 静态 preview 暴露 dist；仍不接 Playwright QA 或 repair。

### 6. Compiler + Build + Preview

完成时间：2026-06-10

已完成内容：

- 新增 `apps/maker-api/src/compiler/compiler.types.ts`，定义 runtime compile、build runner 和命令执行边界类型。
- 新增 `TemplateCompilerService`，从 `NormalizedGameIrSchema` 选择 collector / dodger / shooter template，并写入 `generated-projects/<projectId>/`。
- `TemplateCompilerService` 默认 template root 从 `LocalWorkspaceService.getRootDir()/templates/phaser` 派生，不依赖 `process.cwd()`；同 `projectId` 重新编译前会清理旧 generated project，避免模板残留。
- 生成项目会写入 template 源码、`shared/kernel.ts`、`template-params.generated.json`、`package.json`、`index.html` 和 `vite.config.ts`；HTML 入口使用相对路径，Vite `base` 为 `./`。
- 新增 `ViteBuildRunnerService`，只允许构建 `workspace.getGeneratedProjectDir(projectId)`，执行 `npm exec vite build -- <projectDir>`，并把 stdout / stderr 写入 `local-data/build-logs/<projectId>/<runId>.log`。
- build runner 对 spawn / exec 非 numeric error code 映射为失败，并保留 `error.message` 到 stderr/log。
- 新增 `PreviewController` 和 `CompilerModule`，通过 `/preview/<projectId>/index.html` 暴露 `generated-projects/<projectId>/dist/index.html`。
- 扩展 `LocalWorkspaceService` 路径能力，新增 generated project、dist 和 build log 路径，并让默认 workspace root 从当前目录向上定位包含 workspaces 的 repo root。
- 新增 `tests/workspace/compiler-service.test.ts`，覆盖模板生成、API package cwd 下模板解析、重复生成清理、build log 成功/失败、projectDir/projectId 边界和 preview dist 路径。
- 扩展 `tests/workspace/local-workspace.service.test.ts`，覆盖 generated project、dist 和 build log 路径。

阶段结果：

- Step 6 已打通本地 `Normalized IR -> generated project -> Vite build -> preview index` 的最小链路。
- Preview 只暴露当前 generated project 的 dist index；未引入 Playwright QA、telemetry gate 执行、Auto Repair、Workbench 完整状态流或模型调用。
- Build 日志固定落在 `local-data/build-logs/<projectId>/<runId>.log`，构建目录必须和 projectId 精确匹配。
- 当前新增 compiler/API 源码文件均低于 220 行；最大相关测试文件为 `tests/workspace/compiler-service.test.ts`，141 行。

已通过验证：

    npx vitest run tests/workspace/compiler-service.test.ts
    # 1 个测试文件，7 个测试通过

    npx vitest run tests/workspace/local-workspace.service.test.ts tests/workspace/compiler-service.test.ts
    # 2 个测试文件，12 个测试通过

    npm test
    # contract tests 28 个通过；workspace tests 37 个通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx tsx --eval "<TemplateCompilerService smoke>"
    # 使用 collector Raw DSL 归一化后的 IR 成功生成 generated-projects/proj_step6_build_smoke

    npm exec vite build -- generated-projects/proj_step6_build_smoke
    # Vite 真实 build 成功，生成 dist/index.html 和 dist/assets/*

    npx tsx --eval "<ViteBuildRunnerService smoke>"
    # 默认 build runner 返回 ok true，并写入 local-data/build-logs/proj_step6_build_smoke/run_step6_build_smoke.log

    npm run start --workspace @ai-game-maker/maker-api
    curl -i http://localhost:3000/preview/proj_step6_build_smoke/index.html
    curl -s http://localhost:3000/health
    # preview 返回 HTTP 200，health 返回 {"service":"maker-api","status":"ok"}
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P1：compiler 默认 templateRoot 依赖 `process.cwd()`；build runner 只校验 projectDir 在 workspace 内，未绑定到当前 projectId。
- Oracle 首轮还发现 P2：默认 `execFile` runner 在非 numeric error code 时可能误报成功；同 projectId 重编译不清理旧 generated project。
- 已修复：template root 改为从 workspace root 派生；build runner 要求 `resolve(projectDir) === workspace.getGeneratedProjectDir(projectId)`；非 numeric exec error 映射为 exitCode 1；compile 前清理 outputDir；补充对应测试。
- 真实 Vite build smoke 发现 CLI 契约问题：`vite build` 的 root 是位置参数，不支持 `--root`。已修正为 `npm exec vite build -- <projectDir>`，并用真实 Vite build 和默认 build runner smoke 复验。
- Oracle 复审：P0/P1/P2 均无，Step 6 可通过代码审查门禁。
- P3：默认 `execFile` runner 的非 numeric error 分支未直接以真实 spawn 失败覆盖；当前实现逻辑明确，后续如需要可通过注入底层命令或拆出 runner 单测补强。
- 审查模式：Oracle 复用

下一步建议：

- Step 7：Playwright QA。实现 deterministic QA runner、preview 页面自动化、telemetry gate 判定和 QA report 写入；仍不接 Auto Repair 或 Workbench 完整状态流。

### 7. Playwright QA

完成时间：2026-06-10

已完成内容：

- 新增本地 QA dev dependency `playwright`，并安装 Chromium 浏览器二进制用于真实浏览器验收。
- 三个 Phaser template 的 `src/main.ts` 增加 deterministic 键盘输入映射：collector 用 Enter / ArrowRight / r，dodger 用 Enter / ArrowRight / h / r，shooter 用 Enter / Space / ArrowRight / r。
- QA bridge 保持 Step 5 冻结边界，只暴露 start / restart / snapshot / telemetry；Playwright 通过真实页面键盘事件触发 runtime 方法，不直接写 telemetry 或直接标记胜负。
- 新增 `apps/maker-api/src/qa/qa.types.ts`，定义 QA report、browser runner、gate evaluation 和失败码。
- 新增 `PlayableQaGateService`，复用 `playable-qa-gate-v0.1.json`，按 common + genre `all` 以及 `any_groups` 语义判定 telemetry gate。
- 新增 `playwright-browser-runner.ts`，打开 preview URL 并追加 `?qa=1&seed=golden`，等待 QA bridge，执行 genre-specific 键盘序列，读取 telemetry，并用 `TelemetryEventSchema` 解析浏览器返回事件。
- 新增 `PlaywrightQaRunnerService`，合并 browser runner 结果与 gate 结果，写入 `local-data/qa-reports/<projectId>/<runId>.json`。
- 新增 `QaModule` 并导入 `AppModule`。
- 真实 QA 发现 Vite build assets 404 后，补充 `PreviewController` 的 `/preview/:projectId/assets/:fileName` 路由，限制只能服务 `generated-projects/<projectId>/dist/assets` 下的单段文件。
- 新增 `tests/workspace/playwright-qa-runner.test.ts`，覆盖 gate all/any_groups、PASSED report、REQUIRED_TELEMETRY_MISSING report 和 QA_BRIDGE_MISSING report。
- 扩展 `tests/contracts/phaser-templates.test.ts`，覆盖 deterministic keyboard input 映射。

阶段结果：

- Step 7 已打通 `preview page -> Playwright keyboard input -> runtime telemetry -> telemetry gate -> QA report` 的最小闭环。
- collector、dodger、shooter 三类真实 E2E smoke 均返回 `PASSED`，且 `missing_events` / `missing_any_groups` 为空。
- QA report 保留 observed events、missing events、missing any groups、console errors、snapshot、failure code、message 和 started/completed timestamp。
- 本阶段未接 Auto Repair、Workbench 完整状态流、模型调用或 DSL/IR 修改。
- 当前新增 QA 源码文件均低于 220 行；最大相关源码为 `playwright-browser-runner.ts`。

已通过验证：

    npx vitest run tests/workspace/playwright-qa-runner.test.ts
    # 1 个测试文件，4 个测试通过

    npx vitest run tests/workspace/playwright-qa-runner.test.ts tests/contracts/phaser-templates.test.ts
    # 2 个测试文件，12 个测试通过

    npx vitest run tests/workspace/compiler-service.test.ts tests/workspace/playwright-qa-runner.test.ts tests/contracts/phaser-templates.test.ts
    # 3 个测试文件，19 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 41 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    npx playwright install chromium
    # 安装 Chromium / headless shell / ffmpeg 到本机 Playwright cache

    npx tsx --eval "<compile and build collector/dodger/shooter smoke>"
    # proj_step7_collector_smoke、proj_step7_dodger_smoke、proj_step7_shooter_smoke 均 compile/build 成功

    npm run start --workspace @ai-game-maker/maker-api
    npx tsx --eval "<PlaywrightQaRunnerService collector/dodger/shooter smoke>"
    # collector/dodger/shooter 均 status: PASSED，missing_events 和 missing_any_groups 为空
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P2：页面加载成功但 QA bridge 缺失时会被误报为 `PREVIEW_LOAD_FAILED`。
- 已修复：`page.goto()` 与 QA bridge wait 分开映射；加载失败返回 `PREVIEW_LOAD_FAILED`，bridge wait 失败且无 console error 返回 `QA_BRIDGE_MISSING`，有 console error 返回 `FATAL_CONSOLE_ERROR`；`message` 会进入最终 QA report。
- 同步补充 `QA_BRIDGE_MISSING` report 语义测试。
- Oracle 复审：P0/P1/P2 均无，Step 7 可通过代码审查门禁。
- P3：真实 browser runner 的 bridge wait 分支未直接用 Playwright failure fixture 覆盖；`chromium.launch()` 失败仍会在外层 try 之前抛出，不生成 QA report。当前本机已安装 Chromium 且真实 smoke 通过，后续如需要可收敛为环境失败 report。
- 审查模式：Oracle 复用

下一步建议：

- Step 8：Auto Repair。实现 QA/validation 失败后的 DSL patch repair 流程、最多 2 次修复限制和 repair report；仍不接 Workbench 完整状态流。

### 8. Auto Repair

完成时间：2026-06-10

已完成内容：

- 新增 `DslPatchSchema`，冻结 `game-dsl-patch-v0.1` patch schema，并从 `packages/game-dsl/src/index.ts` 导出。
- `LocalWorkspaceService` 新增 `getRepairReportPath(projectId, runId)`，repair report 固定写入 `local-data/repair-reports/<projectId>/<runId>.json`。
- 新增 `apps/maker-api/src/repair/dsl-repair.types.ts`，定义 `MAX_REPAIR_ATTEMPTS = 2`、repair input/report/attempt 类型。
- 新增 `dsl-patch-apply.ts`，安全应用 DSL patch；禁止修改 `dsl_version`、`game.genre`、template 相关路径，并按 path segment 拒绝 `__proto__`、`prototype`、`constructor`。
- 新增 `dsl-repair-recipes.ts`，提供本地确定性 repair recipe，覆盖 collector / dodger / shooter 常见缺失机制：collectible、hazard、projectile、enemy、collision、action、objective reachability。
- 新增 `DslRepairService`，执行 `create patch -> apply patch -> validateAndNormalizeRawGameDsl -> write repair report`；attempt 必须是整数且范围为 1..2，否则返回 `REPAIR_FAILED`。
- 新增 `RepairModule` 并导入 `AppModule`。
- 新增 `tests/workspace/dsl-repair-service.test.ts`，覆盖 shooter 缺 projectile/collision 修复、collector scoring reachability 修复、attempt 边界、protected path 和 prototype pollution path。
- 扩展 `tests/workspace/local-workspace.service.test.ts`，覆盖 repair report path。

阶段结果：

- Step 8 已提供受限 DSL patch repair 能力，repair 后必须重新进入 `validateAndNormalizeRawGameDsl`，不提供绕过 validator / IR 的出口。
- repair service 的 `REPAIRED` 只表示 DSL validation/normalization 通过；真实 compile/build/QA 仍由外部流水线继续执行。
- 本阶段未直接修改 runtime telemetry、未跳过 QA、未接 Workbench 完整状态流、未调用真实模型。
- 当前 repair 相关源码文件均低于 220 行；最大新增源码为 `dsl-repair-recipes.ts`，171 行。

已通过验证：

    npx vitest run tests/workspace/dsl-repair-service.test.ts tests/workspace/local-workspace.service.test.ts
    # 2 个测试文件，9 个测试通过

    npx vitest run tests/workspace/dsl-repair-service.test.ts
    # 1 个测试文件，5 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 46 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    npx tsx --eval "<repair shooter missing projectile smoke>"
    # 删除 shooter projectile 和 collision 后，repair 返回 REPAIRED；repaired_dsl 重新 validate/normalize 通过；compile/build 成功

    npm run start --workspace @ai-game-maker/maker-api
    npx tsx --eval "<PlaywrightQaRunnerService repaired shooter smoke>"
    # repaired shooter preview 真实 QA 返回 PASSED，missing_events 和 missing_any_groups 为空
    # 验收后手动 Ctrl-C 停止服务；退出码 130 仅代表手动停止

审查门禁结论：

- Oracle 只读审查首轮发现 P1：patch path 未拒绝 `__proto__` / `prototype` / `constructor`，存在 prototype pollution 风险。
- Oracle 首轮还发现 P2：attempt 只拒绝 `> MAX_REPAIR_ATTEMPTS`，未拒绝 0、负数或非整数。
- 已修复：`assertAllowedPatchPath()` 按 segment 拒绝 `__proto__`、`prototype`、`constructor`；`DslRepairService.repair()` 要求 attempt 为整数且 `1 <= attempt <= MAX_REPAIR_ATTEMPTS`；补充 `__proto__.polluted` 和 attempt=0 测试。
- Oracle 复审：P0/P1/P2 均无，Step 8 可通过代码审查门禁。
- P3：prototype pollution 测试只直接覆盖 `__proto__`，实现同时拒绝 `prototype` / `constructor`；后续可参数化补强。
- 审查模式：Oracle 复用

下一步建议：

- Step 9：Workbench UI 收尾。实现状态 timeline、preview iframe、QA report、telemetry summary、build log 和 error message 展示；消费既有 API/文件契约，不另造前端私有协议。

### 9. Workbench UI 收尾

完成时间：2026-06-10

已完成内容：

- API 新增最小报告读取端点：`GET /api/projects/:projectId/runs/:runId/qa-report`、`repair-report`、`build-log`。
- `ProjectsService` 读取 QA report、repair report 和 build log 前，会先执行 run ownership 校验，再通过 `LocalWorkspaceService` 派生固定路径。
- `main.ts` 新增本地 CORS middleware：Workbench origin 可访问 API；`Origin: null` 仅允许 `GET/OPTIONS` 且仅限 `/preview/...`，用于 sandbox iframe 加载 preview index/assets。
- Workbench 从骨架改为本地控制台，包含 Generate、Project ID / Run ID、Refresh、Timeline、preview iframe、QA、Telemetry summary、Repair、Events 和 Build Log。
- Workbench iframe 使用 `sandbox="allow-scripts"`，未加 `allow-same-origin`、`allow-forms` 或 `allow-popups`。
- 新增 `apps/maker-workbench/src/workbench-api.ts`，收敛 API base、response 类型、request helper 和 telemetry summary helper。
- 新增 `apps/maker-workbench/src/styles.css`，提供 Workbench 双栏/响应式布局。
- 扩展 `tests/workspace/projects-service.test.ts`，覆盖 QA report、repair report、build log 读取和 run ownership 失败。

阶段结果：

- Step 9 已实现可本地演示的 Workbench UI，消费既有 project/run/report/log/preview 契约，不另造前端私有协议。
- 本阶段未改模型、DSL Validator、IR Normalizer、Compiler、QA 或 Repair 核心语义。
- 本阶段未新增登录、权限、多用户、数据库、云部署或生产发布能力。
- 当前 Workbench / API 相关源码文件均低于 220 行。

已通过验证：

    npx vitest run tests/workspace/projects-service.test.ts
    # 1 个测试文件，6 个测试通过

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npm test
    # contract tests 29 个通过；workspace tests 47 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    curl -i -H 'Origin: http://127.0.0.1:5174' http://localhost:3000/api/projects/proj_step9_ui_smoke
    # 返回 Access-Control-Allow-Origin: http://127.0.0.1:5174

    curl -i -H 'Origin: null' http://localhost:3000/api/projects/proj_step9_ui_smoke
    # 返回 200 但不含 Access-Control-Allow-Origin，浏览器无法读取 API 响应

    curl -i -H 'Origin: null' http://localhost:3000/preview/proj_step9_ui_smoke/index.html
    # 返回 Access-Control-Allow-Origin: null，Access-Control-Allow-Methods: GET,OPTIONS

    npm run start --workspace @ai-game-maker/maker-api
    npm run dev --workspace @ai-game-maker/maker-workbench
    # Workbench 因 5173 被占用自动切到 http://127.0.0.1:5174/

    node --input-type=module "<Workbench desktop Playwright smoke>"
    # 页面显示 PLAYABLE、PASSED、score.changed、vite build；iframe 存在；consoleErrors 为空

    node --input-type=module "<Workbench mobile Playwright smoke>"
    # 390x844 无横向 overflow；consoleErrors 为空
    # 截图：local-data/workbench-step9-smoke.png、local-data/workbench-step9-mobile-smoke.png
    # 验收后手动 Ctrl-C 停止服务；API 退出码 130、Workbench 退出码 1 均为手动停服

审查门禁结论：

- Oracle 只读审查首轮发现 P1：`Origin: null` 被全局放行到 API 和 POST，范围超过 sandbox iframe 加载 preview assets 的需要。
- 已修复：Workbench origin 可访问 API；`Origin: null` 只允许 `/preview/...` 的 `GET/OPTIONS`；`/api/*` 携带 `Origin: null` 时不设置 `Access-Control-Allow-Origin`；不允许的 preflight 返回 403。
- Oracle 复审：P0/P1/P2 均无，Step 9 可通过代码审查门禁。
- P3：CORS 行为当前由 curl/browser smoke 覆盖，后续可补轻量 middleware 测试锁住分支。
- 审查模式：Oracle 复用

Step 9 阶段结果：

- Step 0 到 Step 9 已按 review-gated 流程完成代码实现、验证、Oracle/Sentinel 审查和文档沉淀。

### 10. P0 主链路修复

完成时间：2026-06-10

已完成内容：

- 修复 `POST /api/projects/generate` 只创建 Project / Run 的缺口，新增 `GenerationPipelineService` 串联 `idea -> DSL -> DSL validation -> IR -> Phaser/Vite project -> npm install/build -> preview artifact -> Playwright QA -> final status`。
- 新增 deterministic local DSL fallback：无 `.env` / 模型不可用 / provider 抛错时，本地仍能生成可验证 DSL；“做一个小猫射击外星人的小游戏”会进入 shooter 主链路。
- `TemplateCompilerService` 统一生成 `generated-projects/<projectId>/package.json`、`index.html`、`src/main.ts` 和模板源码，`ViteBuildRunnerService` 在生成项目目录执行 `npm install --package-lock=false` 与 `npm run build`。
- build 成功后检查 `generated-projects/<projectId>/dist/index.html`；缺失时状态收敛为 `PREVIEW_ARTIFACT_MISSING`，构建失败或 compiler/build runner 抛错时状态收敛为 `BUILD_FAILED`。
- QA runner 正常失败和启动级异常均会写 QA report；启动级异常写入最小 `QA_FAILED` report，failure code 为 `QA_RUNNER_FAILED`。
- Timeline 记录主链路关键事件：`dsl.generated`、`ir.generated`、`project.generated`、`build.started`、`build.success` / `build.failed`、`qa.started`、`qa.passed` / `qa.failed`。
- Workbench 增加非终态轮询，并按 run status 条件读取 QA / build / repair report，避免不存在的可选 report 产生 404 控制台噪音。
- 新增 `tests/workspace/generation-pipeline.smoke.test.ts`，覆盖“小猫射击外星人”到 `dist/index.html`、preview 200、QA report PASSED 和关键 events。
- 新增 `tests/workspace/generation-pipeline.service.test.ts`，覆盖 compiler 抛异常、build 成功但 preview artifact 缺失、QA runner 抛异常等失败收敛路径。

阶段结果：

- Generate 主链路已不再停留在 `CREATED`；happy path 最终返回 `PLAYABLE`，QA 失败返回 `QA_FAILED`，构建/预览 artifact 失败返回 `BUILD_FAILED` 或 `PREVIEW_ARTIFACT_MISSING`。
- Preview endpoint 继续优先服务 `generated-projects/<projectId>/dist/index.html`。
- 当前实现仍保持本地 P0 范围；未新增数据库、队列、后台 worker、多用户、权限或云部署能力。

已通过验证：

    npm run typecheck
    # root、maker-api、maker-workbench 三段类型检查均通过

    npx vitest run tests/workspace/generation-pipeline.smoke.test.ts
    # 1 个测试通过；真实生成 dist/index.html，preview 200，QA report PASSED

    npx vitest run tests/workspace/generation-pipeline.service.test.ts
    # 3 个测试通过；覆盖 BUILD_FAILED、PREVIEW_ARTIFACT_MISSING、QA_FAILED report 兜底

    npm test
    # contract tests 29 个通过；workspace tests 51 个通过

    npm audit --omit=dev
    # found 0 vulnerabilities

    curl -sS -X POST http://localhost:3000/api/projects/generate \
      -H 'Content-Type: application/json' \
      -d '{"idea":"做一个小猫射击外星人的小游戏","language":"zh"}'
    # 返回 status: PLAYABLE

    curl -sS -o /dev/null -w '%{http_code}\n' \
      http://localhost:3000/preview/<projectId>/index.html
    # 返回 200

    node --input-type=module "<Workbench Generate Playwright smoke>"
    # 页面显示 PLAYABLE、PASSED、build.success；iframeCount=1；console errors=[]

审查门禁结论：

- Sentinel / Oracle 首轮发现 P1：pipeline 缺少阶段级异常收敛，异常可能卡在 `DSL_GENERATING`、`COMPILING`、`BUILDING` 或 `QA_RUNNING` 等中间态。
- Sentinel / Oracle 首轮发现 P1：QA runner 启动级异常时 QA report 不一定落盘。
- 已修复：provider 抛错进入 deterministic fallback；compiler/build runner 异常收敛到 `BUILD_FAILED` 并写 `build.failed`；QA runner 异常写最小 `QA_FAILED` report、收敛到 `QA_FAILED` 并写 `qa.failed`。
- Sentinel / Oracle 复审：P0/P1/P2 均无，代码门禁通过。
- P3：后续可继续补模型 provider throw 的直接测试，以及在 failure tests 中同时断言 `run.json` / `latest-run.json` 状态一致性。
- 审查模式：Oracle 复用

最终结果：

- Step 0 到 Step 9 加 P0 主链路修复均已按 review-gated 流程完成代码实现、验证、Sentinel/Oracle 审查和文档沉淀。
