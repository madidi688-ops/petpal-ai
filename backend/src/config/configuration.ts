export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: '7d',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    vlModel: process.env.DEEPSEEK_VL_MODEL ?? 'deepseek-vl',
    visionNative: process.env.DEEPSEEK_VISION_NATIVE === 'true',
  },
  // 多模态：火山方舟 Responses API（也可用 SEEDANCE_* 别名）
  seedance: {
    apiKey: process.env.ARK_API_KEY ?? process.env.SEEDANCE_API_KEY ?? '',
    baseUrl:
      process.env.ARK_BASE_URL ??
      process.env.SEEDANCE_BASE_URL ??
      'https://ark.cn-beijing.volces.com/api/v3',
    model:
      process.env.ARK_MODEL ??
      process.env.SEEDANCE_MODEL ??
      'doubao-seed-2-1-pro-260628',
    /** 支持 input_audio 的接入点（如 Seed 2.0 Lite）；不设则与 ARK_MODEL 相同 */
    audioModel: process.env.ARK_AUDIO_MODEL ?? '',
  },
  /** 供远端模型拉取 uploads；Render 会注入 RENDER_EXTERNAL_URL */
  publicBaseUrl: (() => {
    const raw =
      process.env.PUBLIC_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      `http://localhost:${process.env.PORT ?? '4001'}`;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
    return `https://${raw.replace(/\/$/, '')}`;
  })(),
});
