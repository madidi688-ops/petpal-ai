# PetPal AI · 本地环境与开发复现手册

> 本文记录：安装过程、本机工具清单、前期/后续开发节点、踩坑与解决办法。  
> 目的：方便你查阅、理解和在本机（或新机器）**复现**。  
> 最后更新：2026-07-16 13:18（已写 `docs/HANDOFF.md` 供新对话交接；Docker 仅 DB 层；前后端宿主机运行）

---

## 1. 项目一句话

**PetPal AI**：纯软件形态的宠物 AI 陪伴助手（情绪对话 + 行为记录 + AI 日记 + MBTI 画像）。  
仓库（私有）：https://github.com/madidi688-ops/petpal-ai  
本地路径：`d:\vibe coding\petpal-ai`

---

## 2. 本机当前相关工具清单

| 名称 | 路径 | 版本（当时） | 作用 |
|---|---|---|---|
| **Git** | `C:\Program Files\Git\cmd\git.exe` | 2.55.0 | 版本管理 |
| **GitHub CLI (`gh`)** | `C:\Program Files\GitHub CLI\gh.exe` | 2.96.0 | 创建/管理 GitHub 仓库、认证 |
| **Node.js** | `C:\Program Files\nodejs\node.exe` | v24.18.0 | 跑 NestJS / Next.js |
| **npm** | `C:\Program Files\nodejs\npm.cmd` | 11.16.0 | 装依赖、跑脚本 |
| **npx** | `C:\Program Files\nodejs\npx.ps1` | 随 npm | 临时执行包命令（如 prisma） |
| **winget** | `...\WindowsApps\winget.exe` | 已装 | Windows 装软件 |
| **Python (Anaconda)** | `C:\Users\mdd\anaconda3\python.exe` | 3.8.20 | 通用 Python（本项目主流程不用） |
| **Conda** | `C:\Users\mdd\anaconda3\Scripts\conda.exe` | 24.9.1 | Python 环境；**会注入 SSL_CERT_FILE，影响 gh/git** |
| **Cursor** | `C:\Program Files\cursor\Cursor.exe` | — | IDE / AI 开发 |
| **NoMachine** | `C:\Program Files\NoMachine\bin\nxd.exe` | — | 远程桌面；**占用 4000 端口** |
| **Docker** | `C:\Program Files\Docker\Docker\Docker Desktop.exe`；CLI：`...\resources\bin\docker.exe` | Desktop 4.82 / Engine 29.6.1 | 容器：本机 Postgres + Redis |

### 项目运行时本地产物（勿提交）

| 路径 | 说明 |
|---|---|
| `backend/prisma/dev.db` | **历史**本地 SQLite（迁库后可作备份，可删） |
| `backend/node_modules/`、`frontend/node_modules/` | 依赖 |
| `backend/.env`、根目录 `.env`、`frontend/.env.local` | 密钥与配置（已在 `.gitignore`） |
| `frontend/.next/` | Next 构建缓存 |
| Docker volumes `postgres_data` / `redis_data` | Postgres / Redis 持久化数据 |

---

## 3. 安装记录（按时间）

### 3.1 Node.js（为了跑项目）

- **原因**：本机最初没有 `node`/`npm`，无法 `npm install`。
- **做法**：
  ```powershell
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  ```
- **结果**：装到 `C:\Program Files\nodejs\`，版本 v24.18.0。
- **注意**：装完后**旧终端**可能仍提示找不到 npm，需刷新 PATH 或重开终端：
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
  ```

### 3.2 Git（已有，再升级）

- 安装前本机已有 Git。
- 用 winget 升级到 **2.55.0**：
  ```powershell
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  ```

### 3.3 GitHub CLI

- **做法**：
  ```powershell
  winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
  ```
- **结果**：`C:\Program Files\GitHub CLI\gh.exe`

### 3.4 Docker（历史：一度未安装）

- **早期状态**：未安装 → 临时用 SQLite。
- **2026-07-15 晚**：开始安装 Docker Desktop，见 **§3.6**。

### 3.5 未单独「安装」但会用到的 Cursor 能力

- **MCP**：当前会话未接入任何 MCP 服务器。
- **Skill**：Cursor 内置能力（create-rule、canvas 等），按任务按需读取，不是装进本项目的插件。

### 3.6 Docker Desktop 安装与 Postgres/Redis 迁库（已完成）

- **开始时间**：2026-07-15 约 23:24
- **完成时间**：2026-07-16 约 13:10
- **安装命令**：
  ```powershell
  winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements
  winget install --id Microsoft.WSL -e --accept-source-agreements --accept-package-agreements
  # 重启后若仍无发行版：
  winget install --id Canonical.Ubuntu.2404 -e --accept-source-agreements --accept-package-agreements
  ```

#### 最终状态（2026-07-16）

| 项 | 结果 |
|---|---|
| Docker Desktop | Running（Engine 29.6.1） |
| WSL | `docker-desktop` Running (WSL2) |
| Postgres | `petpal-postgres` **healthy**，端口 5432 |
| Redis | `petpal-redis` **healthy**，端口 6379 |
| Prisma | `provider=postgresql`，`db push` 成功 |
| Seed | `demo@petpal.ai` / `demo1234` |

#### 踩坑与解决（本节）

1. **重启后进程全断**：预期行为；Agent 不会自动续跑，需重新执行命令。
2. **重启后 Docker 引擎未起**：需手动/脚本启动 Docker Desktop；并补装 Ubuntu 发行版（`wsl -l` 曾提示无发行版）。
3. **`docker pull` TLS 失败**（`x509: certificate signed by unknown authority`，与 gh/git 同类问题）：改用 DaoCloud 镜像：
   ```powershell
   docker pull docker.m.daocloud.io/library/postgres:16-alpine
   docker pull docker.m.daocloud.io/library/redis:7-alpine
   docker tag docker.m.daocloud.io/library/postgres:16-alpine postgres:16-alpine
   docker tag docker.m.daocloud.io/library/redis:7-alpine redis:7-alpine
   docker compose up -d postgres redis
   ```
4. **迁库策略**：保留 `backend/prisma/dev.db` 作 SQLite 备份；Postgres 空库 + `prisma db push` + `seed`（不导入旧聊天历史）。

#### 已完成的配置改动

| 文件 | 改动 |
|---|---|
| `backend/prisma/schema.prisma` | `provider = "postgresql"` |
| `backend/.env` | Postgres + Redis URL；`PORT=4001` |
| `.env.example` | 同步 |
| `docker-compose.yml` | 去掉过时 `version`；注明镜像拉取兜底 |

#### 日常启动（迁库完成后）

```powershell
cd "d:\vibe coding\petpal-ai"
docker compose up -d postgres redis
cd backend; npm run start:dev
# 另开终端
cd frontend; npm run dev
```

---

## 4. 产品与技术方案（前期决策）

| 决策项 | 结论 |
|---|---|
| 赛道 | 宠物 AI |
| 形态 | **纯软件**（无项圈/硬件） |
| 核心价值 | 情绪陪伴对话 + 行为分析 / AI 日记 / MBTI |
| 前端 | Next.js 14 + Tailwind |
| 后端 | NestJS + Prisma |
| LLM | DeepSeek API |
| 数据采集 | 文本为主，图片可选 |
| 部署目标 | 个人低成本；本地优先 |
| 多 Agent 协作 | 按目录拆：`frontend` / `backend` / `ai-agents` / `infra` / `docs` |

协作契约见：`docs/00-overview.md`～`docs/05-conventions.md`。

---

## 5. 开发记录（实施过程）

### Sprint 1 · 基建

- 创建 monorepo 目录、`README`、`.env.example`、`.gitignore`
- 写齐 `docs/` 协作文档
- 写 `docker-compose.yml` + Dockerfile（为以后 Docker 环境准备）
- NestJS 骨架：Auth、Health、Prisma、LLM/Redis 封装
- Next.js 骨架：登录页、dashboard 壳

### Sprint 2 · 宠物档案 + 行为

- 后端：`/pets` CRUD、`/pets/:id/behaviors`
- 前端：宠物卡片、行为记录页、图片上传（可选）

### Sprint 3 · 对话 + 情绪

- DeepSeek 封装（无 Key 时走演示 mock）
- `/pets/:id/chat`、短期记忆（Redis 可选）
- 对话后写 `EmotionLog`
- 前端聊天气泡页

### Sprint 4 · 日记 + MBTI

- `/pets/:id/diary/generate`、`/pets/:id/mbti/refresh`
- 前端详情页：日记时间线 + MBTI 轴图

### 本地首次跑通

1. 安装 Node
2. 因无 Docker → 改 SQLite schema（去掉 Postgres 特有 enum/array/Json）
3. `npm install` → `prisma generate` → `prisma db push` → `seed`
4. 后端原计划 `:4000`，与 NoMachine 冲突 → **改 `:4001`**
5. 前端 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4001`
6. DeepSeek Key 写入 `backend/.env` 后重启后端

### GitHub 发布

- 账号：`madidi688-ops`
- 仓库：`petpal-ai`，**私有**
- 本地 `git init` + 首次 commit（111 文件）
- `gh repo create` 成功，但 **`git push` 失败**（见问题章节）
- 最终用 `infra/scripts/upload-via-gh-api.ps1` 经 GitHub API 上传成功

---

## 6. 遇见的问题与解决办法

### 问题 A：找不到 `npm` / `gh`

- **现象**：终端 `npm : 无法将“npm”项识别为...`
- **原因**：刚装完软件，当前终端 PATH 未刷新；或开着旧终端。
- **解决**：
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
  ```
  或：关掉终端重开。也可用完整路径：
  ```powershell
  & "C:\Program Files\GitHub CLI\gh.exe" auth status
  ```

### 问题 B：没有 Docker / 没有 Postgres、Redis

- **现象**：无法按原计划 `docker compose up`
- **解决**：本地数据库改为 **SQLite**；Redis 失败时对话仍可走 DB/降级。

### 问题 C：Prisma + SQLite 校验失败

- **现象**：`enum` / `Json` / `String[]` 报 “current connector does not support”
- **解决**：schema 改为纯 `String` 字段；日记里的行为 ID 列表用 `JSON.stringify` 存字符串。

### 问题 D：端口 4000 连不上

- **现象**：`Invoke-RestMethod http://127.0.0.1:4000` 连接被关闭
- **原因**：`NoMachine` 的 `nxd.exe` 占用 `0.0.0.0:4000`
- **解决**：后端改 `PORT=4001`，前端 API 基址同步改成 4001。

### 问题 E：`gh auth login` 浏览器登录 TLS 失败

- **现象**：`x509: certificate signed by unknown authority`
- **原因**：conda `(base)` 设置了  
  `SSL_CERT_FILE=C:\Users\mdd\anaconda3\Library\ssl\cacert.pem`，干扰 `gh`（Go）的证书校验。
- **解决**：登录前先执行：
  ```powershell
  Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue
  ```
  再用 Token 登录：
  ```powershell
  "YOUR_TOKEN" | gh auth login --with-token
  ```
- **安全提醒**：Token 不要贴进聊天/命令历史；泄露后立刻到 GitHub Settings → Tokens **作废并重建**。

### 问题 F：`git push` 失败

- **现象**：  
  - `SEC_E_UNTRUSTED_ROOT` / `self-signed certificate in certificate chain`  
  - 或 `curl 55 Send failure: Connection was reset`
- **原因**：本机存在 HTTPS 拦截/自签证书链（安全软件或代理一类），Git 协议推送被阻断。
- **解决**：用 GitHub **Git Data / Contents API** 上传（脚本：`infra/scripts/upload-via-gh-api.ps1`）。  
  仓库已非空后，若仍要用 git：可临时  
  `git -c http.sslVerify=false fetch/push`（仅本机网络异常时的权宜之计，不要做成默认全局配置）。

### 问题 G：空仓库 Git Data API 返回 409

- **现象**：`gh: Git Repository is empty. (HTTP 409)` when creating blobs
- **解决**：先用 Contents API 写入 `README.md` 做 bootstrap，再批量建 blob → tree → commit → 更新 `refs/heads/main`。

### 问题 I：Docker Desktop 装好但引擎起不来

- **现象**：`docker` 客户端有，但 `docker info` 长时间不就绪。
- **原因**：本机 WSL 未完整可用；安装 `Microsoft.WSL` 后提示需重启「虚拟机平台」。
- **解决**：
  1. `winget install Microsoft.WSL`
  2. **重启 Windows**
  3. 打开 Docker Desktop → Running
  4. `docker compose up -d postgres redis`

### 问题 J：从 SQLite 迁到 Postgres

- **策略**：保留 `dev.db` 备份；Prisma schema `provider` 改为 `postgresql`；空库 `db push` + `seed` 重建演示账号。
- **不迁**：历史聊天记录（演示数据可重新 seed）。

---

## 7. 推荐复现步骤（干净机器 / 本机重来）

### 7.1 安装基础软件

```powershell
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
# 可选：Docker Desktop（若希望用 Postgres 而不是 SQLite）
```

重开终端，并建议在跑 `gh`/`git` 前：

```powershell
Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
```

### 7.2 拉代码

```powershell
gh auth login   # 或 token 方式
git clone https://github.com/madidi688-ops/petpal-ai.git
cd petpal-ai
```

若 clone/push 仍遇证书问题，可从 GitHub 网页下载 ZIP，或参考 `infra/scripts/upload-via-gh-api.ps1` 的反向思路。

### 7.3 配置环境变量

```powershell
copy .env.example backend\.env
# backend/.env 关键项：
# DATABASE_URL=postgresql://petpal:petpal@localhost:5432/petpal?schema=public
# REDIS_URL=redis://localhost:6379
# PORT=4001
# DEEPSEEK_API_KEY=你的密钥
```

前端：`frontend/.env.local` 中 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4001`

### 7.3.1 先起 Postgres + Redis（需 Docker + WSL 可用）

```powershell
cd "d:\vibe coding\petpal-ai"
docker compose up -d postgres redis
docker compose ps
```

### 7.4 启动后端

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run start:dev
```

健康检查：http://localhost:4001/health  
演示账号：`demo@petpal.ai` / `demo1234`

### 7.5 启动前端

```powershell
cd frontend
npm install
npm run dev
```

打开：http://localhost:3000

---

## 8. 常用命令速查

```powershell
# 清 conda 证书干扰 + 刷新 PATH
Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

# 看谁占用端口
netstat -ano | findstr ":4000 :4001 :3000"

# GitHub 登录状态
gh auth status

# 以后功能完善要公开仓库时
gh repo edit madidi688-ops/petpal-ai --visibility public
```

---

## 9. 目录与 Agent 协作（后续开发怎么切）

| 你说 | Agent 主要改 | 先读 |
|---|---|---|
| 切到前端 Agent | `frontend/` | `docs/01-frontend.md` |
| 切到后端 Agent | `backend/` | `docs/02-backend.md`、`docs/04-data-schema.md` |
| 切到 AI Agent | `backend/src/ai/prompts/`、`ai-agents/` | `docs/03-ai-agent.md` |
| 切到部署 Agent | `infra/`、`docker-compose.yml` | `docs/05-conventions.md` |

---

## 10. 当前已知局限（后续可改进）

1. Docker Hub 直连本机常因 TLS 证书失败；拉镜像需走 DaoCloud 等镜像源（见 §3.6）。
2. 迁库策略是 Postgres 空库 + seed，不是把 SQLite 聊天历史全量迁过去（`dev.db` 仍可作备份）。
3. 本机 HTTPS 证书环境异常，`git push` 不稳定；已用 API 上传兜底。
4. DeepSeek Key、GitHub Token 只能放本地 `.env` / `gh` 凭据，**禁止提交到仓库**。
5. 重启电脑后，Agent 进程与 `npm`/`docker` 前台任务都会断；需重新 `compose up` 与 `npm run`。

---

## 11. 附录：关键本地端口

| 服务 | 端口 | 说明 |
|---|---|---|
| Next.js 前端 | 3000 | http://localhost:3000 |
| NestJS API | **4001** | 因 4000 被 NoMachine 占用 |
| Postgres（Docker） | 5432 | `petpal/petpal`，库名 `petpal` |
| Redis（Docker） | 6379 | 对话短期记忆 |

重启并使 Docker Running 后：`docker compose up -d postgres redis`
