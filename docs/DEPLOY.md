# 公网 Demo 部署（Render）

## 一键部署

1. 打开：https://dashboard.render.com/select-repo?type=blueprint  
2. 连接 GitHub 仓库 `madidi688-ops/petpal-ai`  
3. 确认使用根目录 `render.yaml`  
4. 创建服务后，在 **petpal-api** 的 Environment 中按需填（可不填，走演示模式）：
   - `DEEPSEEK_API_KEY`
   - `ARK_API_KEY` / `ARK_MODEL` / `ARK_AUDIO_MODEL`  
5. 等待两个 Web Service 变绿，打开 **petpal-web** 的 URL  

演示账号：`demo@petpal.ai` / `demo1234`

## 注意

- Free 实例闲置约 15 分钟会休眠，首次打开可能要等 30–60 秒  
- Free Postgres 有期限（约 30 天），到期需升级或重建  
- API Key **只**配在 Render 后台的 petpal-api，不要写进仓库  

## 简历链接

部署成功后把 `https://petpal-web-xxxx.onrender.com` 写进 README「在线 Demo」。
