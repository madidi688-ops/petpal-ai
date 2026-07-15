# Chains

Sprint 1–4 的编排逻辑已内联到后端 service（更易 Nest 编译）：

| Chain | 实现位置 |
|---|---|
| chat | `backend/src/modules/chat/chat.service.ts` |
| diary | `backend/src/modules/diary/diary.service.ts` |
| mbti | `backend/src/modules/mbti/mbti.service.ts` |
| emotion | `backend/src/modules/emotion/emotion.service.ts` |

Prompt 文本见 `../prompts/` 与 `backend/src/ai/prompts/`（保持同步）。
