# PetPal AI · 公开演示与录屏指南

> 求职 / 路演用。目标：让别人 **5 分钟内看懂**，或 **自己 2 分钟录完一条可发作品集的视频**。

## 公开入口

| 入口 | 说明 |
|---|---|
| GitHub 仓库 | https://github.com/madidi688-ops/petpal-ai （已公开） |
| 产品案例 | [`PRODUCT-CASE.md`](./PRODUCT-CASE.md) |
| 案例摘要页 | http://localhost:3000/case |
| 本地 Demo | README「快速启动」→ http://localhost:3000 |
| 演示账号 | `demo@petpal.ai` / `demo1234` |
| 静帧故事板 | [`demo/stills/`](./demo/stills/) |
| **演示视频** | https://github.com/madidi688-ops/petpal-ai/releases/tag/demo-v1 |

> 若尚未部署公网 URL：作品集先放 **GitHub + 录屏 + 本案例文档**；公网托管可后续挂 Vercel/Railway（注意 API Key 勿进前端）。

## 2 分钟演示路径（必须按序）

1. **登录** — 首页一键演示登录，或手动输入演示账号  
2. **发猫视频** — 打开「年糕」聊天，发送 `frontend/public/media/cat-eating.mp4`  
3. **观察等待态** — 头像呼吸 +「正在看视频…」  
4. **记行为** — 行为页记 1 条吃/玩/睡  
5. **生成日记** — 宠物详情 →「生成今日日记」→ 截分享卡  

## 录屏分镜（建议 90–150 秒）

| 秒 | 画面 | 旁白要点 |
|---|---|---|
| 0–10 | 仓库 README / 案例标题 | 「宠物 AI 陪伴 MVP：多模态 + 行为记忆 + 日记」 |
| 10–25 | 登录进入首页 | 「固定演示路径，不堆功能」 |
| 25–55 | 发视频 → 流式回复 | 「双模型路由：文本 DeepSeek，视频走方舟；失败友好降级」 |
| 55–75 | 记行为 → 生成日记卡 | 「长期记忆沉淀成可分享资产」 |
| 75–100 | 打开 PRODUCT-CASE / eval 报告 | 「有机会判断、证据边界、离线 eval」 |
| 100–120 | 黑场总结 | 「下一步两周验证付费意向，而不是继续堆功能」 |

### 推荐工具

- Windows：Xbox Game Bar（`Win+G`）或 OBS Studio  
- 分辨率：1280×720 即可；勿录 Key / `.env`  
- 导出：`docs/demo/petpal-demo.mp4`（本地保留；大文件勿强行 git 提交，可放网盘/B 站私享链，在 README 贴链接）

### 一键打开演示页（录屏前）

```powershell
cd "d:\vibe coding\petpal-ai"
docker compose up -d postgres redis
# 另开终端：backend start:dev · frontend npm run dev
start http://localhost:3000/login
```

## 静帧故事板（无视频时的替代）

若暂时不能上传视频，用以下静帧（运行 `node infra/scripts/capture-demo-stills.mjs` 生成到 `docs/demo/stills/`）也能支撑作品集：

1. `01-login.png` — 登录 / 一键演示  
2. `02-chat-video.png` — 视频消息与宠物回复  
3. `03-diary-card.png` — 日记分享卡  
4. `04-eval.png` — 终端里 `npm run eval` 全绿  

## 给面试官的 30 秒口头版

> 我做了一个可运行的宠物陪伴 MVP：年轻人独居场景下想被毛孩子「接住」情绪。产品上故意做成视频聊 → 行为 → 日记闭环；工程上文本与多模态分模型，并带离线 eval 管人设和安全。商业上先用两周访谈和假门订阅验证付费，而不是先做 App 上架。
