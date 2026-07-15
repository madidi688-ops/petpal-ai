# 数据模型（Prisma Schema 文档）

> 实际 schema 写在 `backend/prisma/schema.prisma`，本文档是契约。

## ER 概览

```
User 1---N Pet 1---N BehaviorEvent
                    1---N ChatSession 1---N ChatMessage
                    1---N DiaryEntry
                    1---1 MBTIProfile
                    1---N EmotionLog
```

## 表

### User

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| email | text unique | 登录邮箱 |
| passwordHash | text | bcrypt |
| name | text? | 昵称 |
| image | text? | 头像 URL |
| createdAt | timestamptz | |

### Pet

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| userId | uuid FK → User | 主人 |
| name | text | 宠物名字 |
| species | enum | `cat` / `dog` / `other` |
| breed | text? | 品种 |
| birthday | date? | 生日 |
| avatarUrl | text? | 头像 |
| personalityNotes | text? | 用户手写的性格备注，喂给 LLM |
| createdAt | timestamptz | |

### BehaviorEvent

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| petId | uuid FK → Pet | |
| type | enum | `eat` / `drink` / `sleep` / `play` / `groom` / `toilet` / `other` |
| occurredAt | timestamptz | 发生时间 |
| note | text? | 文字描述 |
| imageUrl | text? | 可选图片 |
| moodTag | text? | 用户自己打的情绪标签 |

### ChatSession

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| petId | uuid FK → Pet | |
| userId | uuid FK → User | |
| title | text? | 会话标题（首条消息摘要） |
| createdAt | timestamptz | |

### ChatMessage

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| sessionId | uuid FK → ChatSession | |
| role | enum | `user` / `assistant` / `system` |
| content | text | |
| imageUrl | text? | |
| tokensUsed | int? | 调试用 |

### DiaryEntry

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| petId | uuid FK → Pet | |
| date | date | 对应日期 |
| content | text | 日记正文 |
| moodScore | int | 0-100 |
| highlightBehaviorIds | uuid[] | 引用的行为 ID |
| generatedBy | text | prompt 版本号 |

### MBTIProfile

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| petId | uuid FK → Pet (unique) | |
| ei | int | -100 (I) ... +100 (E) |
| sn | int | -100 (S) ... +100 (N) |
| tf | int | -100 (T) ... +100 (F) |
| jp | int | -100 (J) ... +100 (P) |
| type | text | e.g. `ENFP` |
| summary | text | 文字解读 |
| updatedAt | timestamptz | |

### EmotionLog

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| petId | uuid FK → Pet | |
| source | enum | `chat` / `behavior` / `image` |
| emotion | text | e.g. `happy` / `anxious` |
| score | int | 0-100 置信度 |
| recordedAt | timestamptz | |

## 索引

- `Pet(userId)`、`BehaviorEvent(petId, occurredAt DESC)`、`ChatMessage(sessionId, createdAt)`
- `EmotionLog(petId, recordedAt DESC)`、`DiaryEntry(petId, date DESC)`

## 字段命名约定

- 所有时间字段统一 `*At` 后缀
- 所有外键统一 `*Id`
- 枚举值小写 snake_case