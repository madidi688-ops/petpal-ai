# PetPal AI

> 纯软件形态的宠物 AI 陪伴助手：情绪陪伴对话 + 行为分析 / AI 日记 / MBTI 画像。

## 作品集入口（求职）

| 材料 | 链接 |
|---|---|
| **产品案例（机会/证据/MVP/商业/两周验证 + 模型降级）** | [`docs/PRODUCT-CASE.md`](./docs/PRODUCT-CASE.md) |
| **公开演示与录屏分镜** | [`docs/DEMO.md`](./docs/DEMO.md) |
| **演示静帧** | [`docs/demo/stills/`](./docs/demo/stills/) |
| **案例摘要页（浏览器）** | 启动后打开 http://localhost:3000/case |
| **公开仓库** | https://github.com/madidi688-ops/petpal-ai |
| **离线 Prompt Eval** | 根目录执行 `npm run eval`（见下） |
| **演示录屏（视频）** | [GitHub Release · demo-v1](https://github.com/madidi688-ops/petpal-ai/releases/tag/demo-v1)（下载 `video_demo.mp4`） |

演示账号：`demo@petpal.ai` / `demo1234`

## 形态

- 前端：Next.js 14 (App Router) + TypeScript + TailwindCSS
- 后端：NestJS 10 (Node 20) + TypeScript + Prisma
- 数据库：PostgreSQL 16 + Redis 7
- LLM：
  - **DeepSeek**：纯文本对话
  - **火山方舟 Responses API**：图片 / 视频 / 语音（`ARK_MODEL`；语音可用 `ARK_AUDIO_MODEL`）
- 部署：Docker Compose 起 Postgres + Redis；前后端本地 npm 开发
- 鉴权：JWT（邮箱登录）

## 快速启动

### 方式 A：Docker Compose（推荐）

```bash
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY、ARK_API_KEY（可不填，走演示模式）

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
- 后端健康检查：http://localhost:4001/health
- 演示账号：`demo@petpal.ai` / `demo1234`（seed 后可用；年糕已带头像、样例对话与日记）

### 2 分钟演示路径（评委 / 路演）

登录后按首页「2 分钟演示路径」走，不要乱点：

1. **登录** — `demo@petpal.ai` / `demo1234`（首页可一键演示登录）
2. **发猫视频** — 打开和「年糕」的聊天，发送 `frontend/public/media/cat-eating.mp4`（或任意短视频）
3. **记行为** — 行为页记一条吃 / 玩 / 睡
4. **生成日记** — 宠物详情页点「生成今日日记」，截取分享卡片

### Prompt Eval（离线可跑通）

```bash
# 仓库根目录
npm run eval
```

- 用例：`ai-agents/evals/cases/chat-persona.json`（人设 / 多模态口吻 / 医疗安全）
- 报告：`ai-agents/evals/out/latest.json`
- 说明：[`ai-agents/evals/README.md`](./ai-agents/evals/README.md)

### 录屏静帧（可选）

前后端已启动时：

```bash
npm run demo:stills
```

输出到 `docs/demo/stills/`。完整分镜见 [`docs/DEMO.md`](./docs/DEMO.md)。

> 说明：本机若 4000 被占用（例如 NoMachine），后端请用 `PORT=4001`，并保证前端 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4001`。

### 多模态相关环境变量（`backend/.env`）

```env
DEEPSEEK_API_KEY=...
DEEPSEEK_MODEL=deepseek-chat

ARK_API_KEY=...
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=ep-xxxxxxxx          # 图/视频接入点
ARK_AUDIO_MODEL=ep-yyyyyyyy    # 语音接入点（如 Seed 2.0 Lite；可与 ARK_MODEL 相同若已支持音频）
```

录音会在浏览器内转成 wav 再上传（方舟不支持 webm）。

### 手机局域网体验

电脑与手机连同一 Wi‑Fi 后：

```powershell
powershell -ExecutionPolicy Bypass -File .\infra\scripts\start-lan.ps1
cd frontend
npm.cmd run dev:lan
```

手机浏览器打开脚本打印的地址。切回 PC 请把 `frontend/.env.local` 改回 `http://localhost:4001`，并用 `npm run dev`。

> 注意：手机用 **HTTP** 时，多数浏览器会**禁止麦克风**，也通常无法「安装到主屏幕」。

### 安装到手机（PWA）

已提供 `manifest` + Service Worker。在 **HTTPS**（或电脑 localhost）下可用浏览器「添加到主屏幕 / 安装应用」。

- 这是 Web 应用壳，**不是**上架 App Store / 应用宝的安装包
- 手机要完整录音 + 可安装：需给本机开 HTTPS 隧道（Cloudflare Tunnel / ngrok）再访问

## 目录结构

```
petpal-ai/
├── docs/         # 协作文档（Agent 切换前必读）
│   └── DEV-LOG.md  # 本机安装/开发/排障复现手册（推荐先读）
│   └── HANDOFF.md  # 对话交接清单（新开对话必读）
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