# Pet Companion System

儿童习惯养成产品的前后端一体化工作区。项目以“虚拟宠物陪伴 + 现实愿望激励”为核心，围绕“设定目标 → 完成任务 → 获得能量 → 陪伴宠物 → 升级抽奖”的闭环设计，当前仓库已经包含前端、后端、接口契约、数据库设计和实施计划。

GitHub 仓库地址：[paomofei/pet-companion-system](https://github.com/paomofei/pet-companion-system)

## 项目概览

- 前端：React 18 + Vite + TypeScript + Zustand + TanStack Query
- 后端：NestJS 11 + Prisma + PostgreSQL
- 工作区：npm workspaces，前后端统一在同一仓库内维护
- 鉴权方式：`X-Device-Id` 设备号静默识别
- 抽奖机制：升级触发 `pending_draw`，点击礼物盒直接抽奖，服务端按 `clientRequestId` 幂等
- 成长体系：高光数据、近 7 日趋势、首版 12 枚 / 3 类勋章墙

## 当前能力范围

- 引导页初始化：孩子昵称、宠物昵称、默认开局路径
- 今日页：固定 7 天周历、单列表任务、宠物陪伴区、实时能量反馈
- 目标页：大目标管理、固定图标策略
- 许愿池：固定图标策略、加权抽奖、中奖记录
- 成长页：数据看板、趋势图、勋章墙
- 离线体验：任务、互动、心愿管理支持本地优先；抽奖仅在线

## 仓库结构

```text
Pet_Sys/
├── apps/
│   ├── frontend/          # React + Vite 前端
│   └── backend/           # NestJS + Prisma 后端
├── scripts/               # 根目录校验脚本
├── API接口契约.md
├── 伴读宠物产品规划_完整版.md
├── 产品架构设计.md
├── 伴读宠物数据库设计_修订版.md
├── 前端实施计划.md
├── 后端实施计划.md
├── 多线程协作使用手册.md
├── AGENTS.md
└── package.json
```

## 文档索引

以下文档是当前仓库的正式基线：

- [AGENTS.md](./AGENTS.md)：仓库工作约束、验证策略、协作边界
- [伴读宠物产品规划_完整版.md](./伴读宠物产品规划_完整版.md)：产品需求权威版本
- [产品架构设计.md](./产品架构设计.md)：系统分层、数据流和页面模块约束
- [伴读宠物数据库设计_修订版.md](./伴读宠物数据库设计_修订版.md)：数据模型与持久化规则
- [前端实施计划.md](./前端实施计划.md)：前端执行边界与阶段计划
- [后端实施计划.md](./后端实施计划.md)：后端执行边界与阶段计划
- [API接口契约.md](./API接口契约.md)：前后端联调唯一接口依据
- [多线程协作使用手册.md](./多线程协作使用手册.md)：基线线程、前端线程、后端线程协同说明

## 环境要求

- Node.js：`22.x`，或满足 `>=20 <23`
- npm：使用仓库自带 `package-lock.json`
- PostgreSQL：本地联调建议 `15.x`
- 操作系统：macOS / Linux / Windows 均可

注意：

- 仓库校验脚本会严格检查 Node 版本
- 使用 Node 25 等超出范围版本时，`npm run check:fast` / `npm run check:full` 会被门禁拦住

## 安装依赖

在仓库根目录执行：

```bash
npm ci
```

## 快速开始

### 方式一：仅启动前端 Mock 模式

适合先体验页面、交互和本地流程，不依赖后端和数据库。

1. 创建前端环境文件：

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

2. 保持 `apps/frontend/.env.local` 使用默认配置：

```env
VITE_API_MODE=mock
```

3. 启动前端：

```bash
npm run dev:frontend
```

4. 打开浏览器访问：

```text
http://127.0.0.1:5173
```

### 方式二：前后端 HTTP 联调

适合验证真实接口、数据库落库和 Swagger。

1. 启动 PostgreSQL：

```bash
docker compose -f apps/backend/docker-compose.yml up -d postgres
```

2. 配置后端数据库连接：

```bash
export DATABASE_URL="postgresql://pet_sys:pet_sys@127.0.0.1:5432/pet_sys?schema=public"
```

3. 生成 Prisma Client，并初始化数据库：

```bash
cd apps/backend
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

4. 启动后端：

```bash
npm run start:dev
```

5. 后端默认地址：

```text
API:     http://127.0.0.1:3000/api
Swagger: http://127.0.0.1:3000/docs
```

6. 切回仓库根目录，配置前端改走 HTTP：

```bash
cd ../..
cp apps/frontend/.env.example apps/frontend/.env.local
```

将 `apps/frontend/.env.local` 改为：

```env
VITE_API_MODE=http
VITE_API_BASE_URL=http://127.0.0.1:3000/api
```

7. 启动前端：

```bash
npm run dev:frontend
```

## 常用命令

根目录：

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run test
npm run check:fast
npm run check:full
```

前端工作区：

```bash
npm run typecheck --workspace apps/frontend
npm run build --workspace apps/frontend
npm run dev --workspace apps/frontend
```

后端工作区：

```bash
npm run lint --workspace apps/backend
npm run typecheck --workspace apps/backend
npm run test --workspace apps/backend
npm run build --workspace apps/backend
npm run vercel-build --workspace apps/backend
```

## 前端运行模式

前端支持两种 API 模式：

- `mock`：默认模式，使用 localStorage + mock server，适合演示和页面开发
- `http`：请求真实后端 API，适合集成联调

配置文件示例见：

- [apps/frontend/.env.example](./apps/frontend/.env.example)

## 后端接口说明

- API 基础前缀：`/api`
- Swagger 地址：`/docs`
- 鉴权 Header：`X-Device-Id`
- 统一响应格式：

```json
{ "code": 0, "message": "ok", "data": {} }
```

完整字段和行为定义见：

- [API接口契约.md](./API接口契约.md)

## 本地开发建议

- 先用 `mock` 模式跑通前端页面与交互
- 再切到 `http` 模式做前后端联调
- 所有接口、数据结构、勋章规则和抽奖链路都以文档基线为准，不要绕开契约自行扩展

推荐顺序：

1. `npm ci`
2. `npm run dev:frontend`
3. 前端页面验证完成后，再启动后端和数据库
4. 切换前端到 `VITE_API_MODE=http`
5. 跑 `npm run check:fast`
6. 合并前执行 `npm run check:full`

## 验证策略

仓库根目录：

```bash
npm run check:fast
npm run check:full
```

当前校验逻辑：

- `check:fast`：`lint + typecheck`
- `check:full`：`lint + typecheck + test + build`

根脚本定义见：

- [scripts/mandatory-verification.sh](./scripts/mandatory-verification.sh)

## 部署与构建

前端生产构建：

```bash
npm run build --workspace apps/frontend
```

后端生产构建：

```bash
npm run build --workspace apps/backend
```

后端 Vercel 构建：

```bash
npm run vercel-build --workspace apps/backend
```

后端容器与本地依赖示例见：

- [apps/backend/docker-compose.yml](./apps/backend/docker-compose.yml)
- [apps/backend/Dockerfile](./apps/backend/Dockerfile)

## 设计与产品基线摘要

当前主仓库已经收口到以下关键规则：

- Web 端优先：默认按 `1440 × 900` 设计，最小兼容 `1280 × 800`
- 左侧宠物区固定，右侧内容区独立滚动
- 今日页使用固定 7 天周历和单列表任务结构
- 目标图标固定为 `🎯`
- 心愿图标固定为 `🎁`
- 抽奖仅在线，使用 `clientRequestId` 幂等
- 勋章墙首版为 `12` 枚 / `3` 类
- `X-Device-Id` 绑定 `users.device_id`，V1 一台设备仅绑定一个用户

## 当前已知约束

- `README.md`、产品文档、接口契约、实施计划会并行维护，但接口字段最终以 [API接口契约.md](./API接口契约.md) 为准
- 当前根目录校验依赖 Node 22；若本机版本不符，请先切换版本再跑校验
- 抽奖流程、设备绑定、勋章逻辑已收口到当前 `main`，继续增量修改前应先检查基线文档

## License

当前仓库未声明开源许可证；如需公开分发，请先补充正式 License 文件。
