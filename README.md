# PetPal AI

> 纯软件形态的宠物 AI 陪伴助手：情绪陪伴对话 + 行为分析 / AI 日记 / MBTI 画像。

## 形态

- 前端：Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui
- 后端：NestJS 10 (Node 20) + TypeScript + Prisma
- 数据库：PostgreSQL 16 + Redis 7
- LLM：DeepSeek API（文本 + 多模态）
- 部署：Docker Compose 一键启动
- 鉴权：NextAuth.js

## 快速启动

### 方式 A：Docker Compose（推荐）

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY（可不填，走演示模式）

docker compose up -d postgres redis
# 再分别在本地启动前后端（开发体验更好）
```

### 方式 B：本地开发（需本机有 Node 20 + 已启动的 Postgres/Redis）

```bash
cp .env.example .env

# 1) 基础设施
docker compose up -d postgres redis

# 2) 后端
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev

# 3) 前端（新终端）
cd frontend
npm install
npm run dev
```

访问：
- 前端：http://localhost:3000
- 后端健康检查：http://localhost:4000/health
- 演示账号：`demo@petpal.ai` / `demo1234`（seed 后可用）

## 目录结构

```
petpal-ai/
├── docs/         # 协作文档（Agent 切换前必读）
├── frontend/     # Agent 1：前端
├── backend/      # Agent 2：后端
├── ai-agents/    # Agent 3：AI / Prompt
├── infra/        # Agent 4：部署 / 运维
└── docker-compose.yml
```

## 多 Agent 协作

每个子目录都是独立可推进的模块。切换 Agent 前先读 `docs/05-conventions.md`。

| Agent | 负责目录 | 必读文档 |
|---|---|---|
| 前端 Agent | `frontend/` | `docs/01-frontend.md`、`docs/04-data-schema.md` |
| 后端 Agent | `backend/` | `docs/02-backend.md`、`docs/04-data-schema.md` |
| AI Agent | `ai-agents/` + `backend/src/modules/{chat,diary,mbti,emotion}/` | `docs/03-ai-agent.md` |
| 部署 Agent | `infra/` + `docker-compose.yml` | `docs/05-conventions.md` |

## Agent Checklist（每次提交前自检）

- [ ] `docker compose up` 能跑通
- [ ] 受影响模块的接口契约文档已更新
- [ ] 新增/修改的 Prisma schema 已生成 migration
- [ ] Lint 通过：`pnpm lint` 或 `npm run lint`

## License

MIT