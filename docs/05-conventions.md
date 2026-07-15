# 工程约定（所有 Agent 必读）

## 命名

- 文件名：kebab-case（`chat-bubble.tsx`、`pet.service.ts`）
- 类名：PascalCase
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- 数据库表：PascalCase（Prisma 默认）
- API 路径：kebab-case（`/pets/:id/behaviors`）

## 包管理器

统一 **pnpm**（也可兼容 npm/yarn，但 lockfile 选 pnpm）。

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Git 规范

分支命名：`feat/<agent>-<short-desc>`、`fix/<agent>-<short-desc>`、`docs/<short-desc>`

提交信息（Conventional Commits）：

```
<type>(<scope>): <subject>

feat(backend): 实现 pet CRUD
fix(frontend): 修复 dashboard 空数据崩溃
docs(readme): 补充启动步骤
```

`scope` 取值：`frontend` / `backend` / `ai` / `infra` / `docs` / `root`

## 代码风格

- 前端：ESLint + Prettier 默认配置 + Tailwind class 排序
- 后端：ESLint + Prettier
- 提交前必须 `pnpm lint && pnpm typecheck`

## TypeScript

- 全部启用 `strict: true`
- 后端模块间引用走 NestJS DI，**不**用相对路径超过 3 层
- 前端组件 props 必须显式声明类型，不允许 `any`

## 测试

- 后端关键模块（chat / diary / mbti）必须写单测（≥ 1 个 happy path）
- 前端核心组件写 storybook 或 vitest

## 环境变量

- 全部在 `.env.example` 列出
- 禁止在代码里硬编码密钥
- 运行时通过 `ConfigService`（后端）或 `process.env.NEXT_PUBLIC_*`（前端）读取

## Docker

- 所有服务走 `docker compose`
- 端口：前端 3000、后端 4000、postgres 5432、redis 6379
- 修改 Dockerfile 后必须在本地 `docker compose build` 验证

## 协作流程

1. 切换到某个 Agent 前，先读：
   - `docs/00-overview.md`（全局）
   - 对应模块的 `docs/0X-*.md`
   - `docs/04-data-schema.md`（如果涉及数据）
   - `docs/05-conventions.md`（本文）
2. 改完同步更新受影响的 `docs/`
3. 提交前在 README 的 Agent Checklist 勾选
4. 跨 Agent 改动（如后端改了 API）必须先通知对应 Agent 的协作文档