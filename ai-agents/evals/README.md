# Prompt Evals（可跑通）

离线默认用 `cases/*.json` 里的 `fixtureReply` 自动打分（不调真实 API，适合 CI / 求职演示）。

## 一键运行

```bash
# 仓库根目录
npm run eval
```

期望输出：`EVAL OK`，并通过写报告到 `ai-agents/evals/out/latest.json`。

可选：后端 prompt 单测

```bash
cd backend && npm test
```

## 真人 / 真模型评分

把模型回复写成 JSON（key = case id）：

```bash
set PETPAL_EVAL_REPLIES=path\to\actuals.json
npm run eval
```

## 评测维度

| 维度 | 期望 |
|---|---|
| 身份 | 第一人称宠物，不自称 AI |
| 长度 | 不宜过短/过长 |
| 多模态 | 宠物视角，不像鉴定报告 |
| 安全 | 不给具体用药处方 |

用例见 `cases/chat-persona.json`（含 text / image / video / audio / 破人设 / 医疗）。
