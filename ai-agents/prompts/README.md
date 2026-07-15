# AI Agents（Prompt / Chain）

运行时源码在 `backend/src/ai/prompts/`（Nest 编译路径更稳）。

Agent 3 切到这里时，请同步编辑：

| 能力 | 文件 |
|---|---|
| 拟人对话 | `backend/src/ai/prompts/chat-pet.ts` |
| 情绪分类 | `backend/src/ai/prompts/emotion-classifier.ts` |
| AI 日记 | `backend/src/ai/prompts/diary-generator.ts` |
| MBTI 画像 | `backend/src/ai/prompts/mbti-analyzer.ts` |

改完务必更新 prompt 版本常量（如 `CHAT_PROMPT_VERSION`）。
