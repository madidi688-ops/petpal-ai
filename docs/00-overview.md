# PetPal AI · 项目全景

## 一句话

> 纯软件形态的宠物 AI 陪伴助手。前端 Web，后端 NestJS + Postgres + Redis，DeepSeek 提供对话 / 日记 / MBTI 能力。

## 双核心价值

1. **情绪陪伴 / 拟人化对话**：用户和"自己的宠物"对话，宠物以第一人称口吻回应。
2. **行为分析 / AI 日记 / MBTI 画像**：基于用户长期录入的行为事件，自动生成"宠物视角日记"和 MBTI 性格图谱。

## 架构图

```
+------------+     HTTP     +----------------+     Prisma     +-----------+
|  Browser   | <----------> |  Next.js (FE)  |                | Postgres  |
+------------+              +----------------+                +-----------+
                                       \                       /
                                        \   REST/JSON        /
                                         +----------------+   +-----------+
                                         |  NestJS (BE)   |-->|   Redis   |
                                         +----------------+   +-----------+
                                                 |
                                                 | HTTPS
                                                 v
                                          +-------------+
                                          | DeepSeek API|
                                          +-------------+
```

详见 `04-data-schema.md` 与各模块文档。

## 模块清单

| 模块 | 路径 | Sprint | 状态 |
|---|---|---|---|
| Auth | `backend/src/modules/auth/` | S1 | 骨架 |
| Pets | `backend/src/modules/pets/` | S2 | 骨架 |
| Behaviors | `backend/src/modules/behaviors/` | S2 | 骨架 |
| Upload | `backend/src/modules/upload/` | S2 | 骨架 |
| Chat | `backend/src/modules/chat/` | S3 | 骨架 |
| Emotion | `backend/src/modules/emotion/` | S3 | 骨架 |
| Diary | `backend/src/modules/diary/` | S4 | 骨架 |
| MBTI | `backend/src/modules/mbti/` | S4 | 骨架 |

## 术语

- **Pet**：一个宠物档案
- **BehaviorEvent**：单次行为记录（吃饭、睡觉、抓沙发等），可附图
- **ChatSession / ChatMessage**：一次"对话"及其消息列表
- **DiaryEntry**：AI 生成的某日宠物视角日记
- **MBTIProfile**：基于历史行为聚合出的 MBTI 性格图谱
- **EmotionLog**：情绪时间线的一条记录