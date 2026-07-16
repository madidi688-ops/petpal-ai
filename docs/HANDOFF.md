# PetPal AI · 对话交接清单（HANDOFF）

> **给新开对话的 Agent / 人类**：先读本文件，再读 `docs/DEV-LOG.md`。  
> 交接时间：2026-07-16 13:18（UTC+8）  
> 本地路径：`d:\vibe coding\petpal-ai`  
> GitHub（私有）：https://github.com/madidi688-ops/petpal-ai  
> 账号：`madidi688-ops`

---

## 1. 一句话进度

**MVP 功能已落地并可本机演示；基础设施层 Postgres + Redis 已成功跑在 Docker 里；前后端仍在宿主机用 npm 跑（未容器化前后端）。**

---

## 2. Docker 集成结论（重要）

| 组件 | 是否在 Docker 里 | 状态 |
|---|---|---|
| **Postgres 16** | ✅ 是 | `petpal-postgres` healthy · `localhost:5432` |
| **Redis 7** | ✅ 是 | `petpal-redis` healthy · `localhost:6379` |
| **NestJS 后端** | ❌ 否（宿主机） | `http://localhost:4001` |
| **Next.js 前端** | ❌ 否（宿主机） | `http://localhost:3000` |

- 启动数据层：`docker compose up -d postgres redis`
- 拉镜像若 Docker Hub TLS 失败，用 DaoCloud：
  ```powershell
  docker pull docker.m.daocloud.io/library/postgres:16-alpine
  docker pull docker.m.daocloud.io/library/redis:7-alpine
  docker tag docker.m.daocloud.io/library/postgres:16-alpine postgres:16-alpine
  docker tag docker.m.daocloud.io/library/redis:7-alpine redis:7-alpine
  ```
- `docker-compose.yml` 里仍有 backend/frontend 服务定义，**日常开发未用**；当前只用 postgres + redis。

---

## 3. 已完成的功能（MVP）

- [x] 邮箱注册/登录（JWT）
- [x] 宠物档案 CRUD
- [x] 行为记录（可附图）
- [x] 拟人对话（DeepSeek；无 Key 时有 mock）
- [x] 情绪标签（对话后写入 EmotionLog）
- [x] AI 日记生成
- [x] MBTI 画像刷新
- [x] 协作文档 `docs/00`～`05` + 排障手册 `docs/DEV-LOG.md`
- [x] GitHub 私有仓（经 API 上传，因本机 `git push` TLS/断连）
- [x] Prisma 从 SQLite **迁到 PostgreSQL**（空库 + seed，非全量历史导入）

演示账号：`demo@petpal.ai` / `demo1234`

---

## 4. 当前运行方式（复现）

```powershell
# 每次开机建议
Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue   # conda 会污染 gh/git/docker TLS
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# 1) Docker Desktop 需 Running
cd "d:\vibe coding\petpal-ai"
docker compose up -d postgres redis

# 2) 后端（注意端口 4001，因 NoMachine 占 4000）
cd backend
npm.cmd run start:dev

# 3) 前端（另开终端）
cd "d:\vibe coding\petpal-ai\frontend"
npm.cmd run dev
```

关键 env（在 `backend/.env`，**勿提交**）：

- `DATABASE_URL=postgresql://petpal:petpal@localhost:5432/petpal?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `PORT=4001`
- `DEEPSEEK_API_KEY=...`（已配置过）
- 前端 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4001`

---

## 5. Git / GitHub 状态

- 远端：`origin` → `https://github.com/madidi688-ops/petpal-ai.git`（private）
- 本地：`main...origin/main [ahead 1, behind 2]`（历史因 API 上传不完全一致）
- **未提交到远端的本地改动（交接时）**：
  - 修改：`.env.example`、`README.md`、`backend/prisma/schema.prisma`、`docker-compose.yml`
  - 未跟踪：`docs/DEV-LOG.md`、`infra/scripts/upload-via-gh-api.ps1`、本文件 `docs/HANDOFF.md`
- 推送注意：本机常遇 TLS / `Connection was reset`；可用 `infra/scripts/upload-via-gh-api.ps1` 或 `git -c http.sslVerify=false`（权宜）
- 登录前务必：`Remove-Item Env:SSL_CERT_FILE`

---

## 6. 建议新对话优先做的事

1. **提交并同步** `DEV-LOG.md` / `HANDOFF.md` / Postgres schema / compose 改动到 GitHub  
2. （可选）把 backend/frontend 也真正放进 Docker Compose（目前只有 DB 在容器里）  
3. （可选）配置 Docker Desktop 镜像加速，避免每次 DaoCloud 手动 tag  
4. 产品向：多宠体验打磨、流式对话、Prompt 评测、作业用的一页 A4 机会验证文档  
5. 安全：用户曾在聊天中暴露过 API Key / GitHub Token，提醒轮换

---

## 7. 多 Agent 协作入口

| 指令 | 目录 | 必读 |
|---|---|---|
| 前端 Agent | `frontend/` | `docs/01-frontend.md` |
| 后端 Agent | `backend/` | `docs/02-backend.md`、`docs/04-data-schema.md` |
| AI Agent | `backend/src/ai/prompts/`、`ai-agents/` | `docs/03-ai-agent.md` |
| 部署 Agent | `infra/`、`docker-compose.yml` | `docs/05-conventions.md`、本交接单 |

完整排障史：`docs/DEV-LOG.md`

---

## 8. 给新 Agent 的开场提示（可复制）

```
继续 PetPal AI（d:\vibe coding\petpal-ai）。
先读 docs/HANDOFF.md 和 docs/DEV-LOG.md。
当前：Postgres+Redis 已在 Docker；前后端宿主机 npm；PORT=4001。
私有仓 madidi688-ops/petpal-ai。
下一步优先：把 DEV-LOG/HANDOFF 与 Postgres 相关改动提交并同步到 GitHub。
注意：conda 的 SSL_CERT_FILE 要先 Remove-Item；Docker Hub 拉取用 DaoCloud 镜像。
```

---

*本文件由上下文将满时的交接对话生成，请与 DEV-LOG 一并维护。*
