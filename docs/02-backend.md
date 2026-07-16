# 后端模块契约（Agent 2 必读）

## 技术栈

- NestJS 10 + Node 20 + TypeScript
- Prisma（PostgreSQL）
- ioredis
- @nestjs/jwt + Passport（鉴权）
- class-validator + class-transformer（DTO 校验）

## 目录

```
backend/
├── src/
│   ├── main.ts                   # bootstrap
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/                 # 鉴权
│   │   ├── pets/                 # Pet CRUD
│   │   ├── behaviors/            # BehaviorEvent CRUD
│   │   ├── chat/                 # 对话（调 LLM）
│   │   ├── emotion/              # 情绪分析
│   │   ├── diary/                # AI 日记
│   │   ├── mbti/                 # MBTI 画像
│   │   └── upload/               # 文件上传
│   ├── common/
│   │   ├── filters/              # 全局异常过滤器
│   │   ├── interceptors/         # 响应包装 / 日志
│   │   ├── guards/               # JwtAuthGuard
│   │   └── decorators/           # @CurrentUser、@Public
│   ├── infra/
│   │   ├── prisma/prisma.service.ts
│   │   ├── redis/redis.service.ts
│   │   └── llm/deepseek.service.ts   # 封装 DeepSeek
│   └── config/
│       └── configuration.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── uploads/                      # 本地上传目录（gitignore）
```

## REST 规范

- 基础路径：`/`
- 全局前缀：不加
- 响应包装：`{ ok: boolean; data?: T; error?: { code, message } }`
- 鉴权：除 `/auth/*`、`/health` 外全部走 `JwtAuthGuard`

## 关键接口

| Method | Path | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| POST | `/auth/register` | 邮箱注册 |
| POST | `/auth/login` | 邮箱登录 |
| GET | `/pets` | 当前用户的所有宠物 |
| POST | `/pets` | 新增宠物 |
| GET | `/pets/:id` | 宠物详情 |
| PATCH | `/pets/:id` | 编辑宠物 |
| DELETE | `/pets/:id` | 删除宠物 |
| GET | `/pets/:id/behaviors` | 行为列表（支持分页 / 日期范围） |
| POST | `/pets/:id/behaviors` | 新增行为（含可选图片） |
| POST | `/pets/:id/chat` | 和宠物对话（流式或非流式） |
| GET | `/pets/:id/chat/sessions` | 会话列表 |
| GET | `/pets/:id/chat/sessions/:sid` | 会话消息 |
| POST | `/pets/:id/chat` | 发送消息（非流式；可带 `imageUrl` 走 VL） |
| POST | `/pets/:id/chat/stream` | 流式发送（SSE：`meta` / `delta` / `done` / `error`） |
| POST | `/pets/:id/diary/generate` | 触发日记生成 |
| GET | `/pets/:id/diary` | 日记时间线 |
| POST | `/pets/:id/mbti/refresh` | 重新生成 MBTI |
| GET | `/pets/:id/mbti` | 最新 MBTI 画像 |
| GET | `/pets/:id/emotions` | 情绪时间线 |
| POST | `/upload` | 上传图片，返回 URL |

详细 DTO 见各模块的 `dto/*.ts`。

## 错误码

| code | 含义 |
|---|---|
| `UNAUTHORIZED` | 未登录 / token 过期 |
| `FORBIDDEN` | 无权访问 |
| `NOT_FOUND` | 资源不存在 |
| `VALIDATION_ERROR` | DTO 校验失败 |
| `LLM_ERROR` | DeepSeek 调用失败 |
| `RATE_LIMIT` | 触发限流 |

## 注意事项

- 所有需要登录的接口必须从 `req.user.id` 取当前用户 ID，不要信任请求体里的 userId
- 上传图片限制：≤ 5MB，仅 `image/jpeg|png|webp`
- 调用 LLM 必须走 `DeepseekService`，禁止直接 `fetch`
- 短期对话记忆用 Redis key：`chat:session:{sessionId}:messages`，TTL 24h
- **模型路由**：纯文本 → `DEEPSEEK_*`；带图/音/视频 → 火山方舟 `ARK_*`（`POST /api/v3/responses`，模型如 `doubao-seed-1-8-251228`）