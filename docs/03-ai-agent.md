# AI Agent 契约（Agent 3 必读）

## 目标

统一管理所有 LLM Prompt 与 chain 编排，让"调优 Prompt"这件事只动这一个目录。

## 目录

```
ai-agents/
├── prompts/              # Prompt 副本（与 backend/src/ai/prompts 同步）
│   ├── chat-pet.ts
│   ├── diary-generator.ts
│   ├── mbti-analyzer.ts
│   └── emotion-classifier.ts
├── chains/README.md      # 编排逻辑指向后端 service
└── index.ts
```

**运行时权威源码**：`backend/src/ai/prompts/*.ts`  
调优 Prompt 时请两边同步更新。

## Prompt 设计原则

1. **角色明确**：每个 prompt 必须先告诉 LLM"你是谁"
2. **Few-shot**：复杂任务给 1-3 个示例
3. **结构化输出**：日记 / MBTI 强制 JSON 输出，便于解析
4. **温度**：日记 0.8（要创造性）、MBTI 0.3（要稳定）、情绪分类 0.0
5. **Token 控制**：日记 ≤ 600 tokens、对话回复 ≤ 200 tokens

## 与后端的边界

- AI Agent **不直接读数据库**，而是通过 `infra/llm/deepseek.service.ts` 暴露给后端调用
- 后端负责：取数 → 组装 user message → 调用 chain → 落库
- AI Agent 只负责：prompt 文本 + chain 编排逻辑

## 复用方式

后端模块示例：

```ts
// backend/src/modules/chat/chat.service.ts
import { runChatChain } from '../../../../ai-agents/chains/chat.chain';

async sendMessage(petId: string, userId: string, content: string) {
  const pet = await this.prisma.pet.findUniqueOrThrow({ where: { id: petId } });
  const history = await this.getRecentMessages(petId); // 从 Redis/DB 取
  return runChatChain({ pet, history, userMessage: content });
}
```

## 切换模型

所有 LLM 调用统一从 `DeepseekService` 走，要切换模型只改：

```
DEEPSEEK_MODEL=deepseek-chat   # 或 gpt-4o、qwen-plus 等兼容 OpenAI 协议的模型
DEEPSEEK_BASE_URL=https://api.deepseek.com   # 或 https://api.openai.com/v1
```