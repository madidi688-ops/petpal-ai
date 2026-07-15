# 前端模块契约（Agent 1 必读）

## 技术栈

- Next.js 14 App Router + TypeScript
- TailwindCSS + shadcn/ui
- Zustand（轻量全局状态）+ TanStack Query（服务端状态）

## 目录

```
frontend/
├── app/
│   ├── (auth)/login/             # 登录
│   ├── (app)/
│   │   ├── dashboard/            # 仪表盘：宠物卡片 + 今日情绪
│   │   ├── pets/[petId]/         # 单宠详情（日记时间线、MBTI）
│   │   ├── chat/[petId]/         # 对话页
│   │   ├── behaviors/            # 行为记录列表
│   │   └── settings/             # 设置
│   ├── api/auth/[...nextauth]/   # NextAuth 路由
│   ├── layout.tsx
│   └── page.tsx                  # 重定向到 /dashboard 或 /login
├── components/
│   ├── ui/                       # shadcn 组件
│   ├── pet-card.tsx
│   ├── chat-bubble.tsx
│   ├── emotion-tag.tsx
│   ├── behavior-form.tsx
│   └── mbti-radar.tsx
├── lib/
│   ├── api.ts                    # fetch 封装（统一 baseURL + 鉴权）
│   ├── query-client.ts
│   └── types.ts                  # 与后端共享的 TS 类型（手维护，对应 OpenAPI）
└── hooks/
```

## 与后端的约定

- 所有请求经 `lib/api.ts` 统一封装，baseURL = `process.env.NEXT_PUBLIC_API_BASE_URL`
- 请求头携带 `Authorization: Bearer <jwt>`（NextAuth session token）
- 后端响应格式统一：

```ts
type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
```

## 路由 ↔ 后端 API 对照

| 前端路由 | 调用后端 |
|---|---|
| `/login` | `POST /auth/login` (NextAuth) |
| `/dashboard` | `GET /pets`、`GET /pets/:id/emotions/recent` |
| `/pets/[petId]` | `GET /pets/:id`、`GET /pets/:id/diary`、`GET /pets/:id/mbti` |
| `/chat/[petId]` | `POST /pets/:id/chat`、`GET /pets/:id/chat/sessions` |
| `/behaviors` | `GET /pets/:id/behaviors`、`POST /pets/:id/behaviors` |

## Sprint 顺序

- S1：骨架 + 登录页 + 空 dashboard
- S2：宠物列表 / 新增 / 详情 / 行为记录表单
- S3：对话气泡 UI + 图片上传 + 情绪标签
- S4：日记时间线 + MBTI 雷达图

## 注意事项

- 所有页面必须在登录态下访问（middleware 守卫）
- 上传图片走 `POST /upload`，拿到 URL 再附在 Behavior/Chat 上
- 不要在前端直接调用 DeepSeek，必须走后端